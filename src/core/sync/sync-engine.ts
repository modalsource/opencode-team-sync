import path from 'path';
import type {
  ConfigEntry,
  SyncResult,
  SyncOptions,
  Conflict,
  SyncOperationError,
  Lockfile,
} from '../../types/index.js';
import { FileSystemManager } from '../fs/fs-manager.js';
import { DiscoveryEngine } from '../discovery/discovery-engine.js';
import { AgentValidator, SkillValidator } from '../validator/validators.js';
import { SyncError } from '../../utils/errors.js';
import { ErrorCode } from '../../utils/errors.js';
import { getLogger } from '../../utils/logger.js';
import { getBaseConfigDir } from '../../utils/path-utils.js';

/**
 * Options for syncing configurations
 */
export interface SyncEngineOptions {
  /** Source directory containing configurations to sync */
  sourceDir: string;
  /** Lockfile data */
  lockfile: Lockfile;
  /** Sync options */
  options: SyncOptions;
}

/**
 * Core sync engine that handles synchronization of configurations
 */
export class SyncEngine {
  private fsManager: FileSystemManager;
  private discoveryEngine: DiscoveryEngine;
  private agentValidator: AgentValidator;
  private skillValidator: SkillValidator;
  private logger = getLogger();

  constructor() {
    this.fsManager = new FileSystemManager();
    this.discoveryEngine = new DiscoveryEngine();
    this.agentValidator = new AgentValidator();
    this.skillValidator = new SkillValidator();
  }

  /**
   * Sync configurations from source to destination
   */
  async sync(engineOptions: SyncEngineOptions): Promise<SyncResult> {
    this.logger.info('Starting sync operation');

    const { sourceDir, lockfile, options } = engineOptions;
    const result: SyncResult = {
      added: [],
      updated: [],
      removed: [],
      conflicts: [],
      errors: [],
    };

    try {
      // 1. Discover configurations in source
      this.logger.debug('Discovering configurations in source directory');
      const discoveredConfigs = await this.discoverConfigs(sourceDir);

      if (discoveredConfigs.length === 0) {
        this.logger.warn('No configurations found in source directory');
      }

      // 2. Filter by tags if specified
      const filteredConfigs = this.filterByTags(discoveredConfigs, options);
      this.logger.info(`Found ${filteredConfigs.length} configurations after filtering`);

      // 3. Validate configurations (unless skipped)
      if (!options.noValidate) {
        this.logger.debug('Validating configurations');
        await this.validateConfigs(sourceDir, filteredConfigs, result);
      }

      // 4. Detect changes compared to lockfile
      const changes = this.detectChanges(lockfile.configs, filteredConfigs);
      this.logger.info(
        `Changes detected: ${changes.added.length} added, ${changes.updated.length} updated, ${changes.removed.length} removed`
      );

      // 5. Detect conflicts with personal configs
      const conflicts = await this.detectConflicts(filteredConfigs, lockfile.scope);
      if (conflicts.length > 0) {
        this.logger.warn(`${conflicts.length} conflicts detected`);
        result.conflicts = conflicts;
      }

      // 6. Apply changes (unless dry run)
      if (!options.dryRun) {
        await this.applyChanges(
          sourceDir,
          changes,
          lockfile.scope,
          options.forceTeam || false,
          result
        );
      } else {
        this.logger.info('Dry run mode: skipping actual file operations');
        result.added = changes.added;
        result.updated = changes.updated;
        result.removed = changes.removed;
      }

      this.logger.info('Sync operation completed successfully');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during sync';
      this.logger.error(`Sync operation failed: ${message}`);
      throw new SyncError(message, ErrorCode.SYNC_FAILED, { sourceDir }, error as Error);
    }
  }

  /**
   * Discover configurations in the given directory
   */
  private async discoverConfigs(sourceDir: string): Promise<ConfigEntry[]> {
    try {
      const result = await this.discoveryEngine.discover({
        baseDir: sourceDir,
        computeHash: true,
      });
      return result.configs;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Discovery failed';
      throw new SyncError(
        `Failed to discover configurations: ${message}`,
        ErrorCode.DISCOVERY_ERROR,
        { sourceDir },
        error as Error
      );
    }
  }

  /**
   * Filter configurations by tags
   */
  private filterByTags(configs: ConfigEntry[], options: SyncOptions): ConfigEntry[] {
    let filtered = configs;

    // Include tags (OR logic)
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter((config) =>
        options.tags!.some((tag) => config.tags.includes(tag))
      );
    }

    // Exclude tags
    if (options.excludeTags && options.excludeTags.length > 0) {
      filtered = filtered.filter(
        (config) => !options.excludeTags!.some((tag) => config.tags.includes(tag))
      );
    }

    return filtered;
  }

  /**
   * Validate configurations
   */
  private async validateConfigs(
    sourceDir: string,
    configs: ConfigEntry[],
    result: SyncResult
  ): Promise<void> {
    const errors: SyncOperationError[] = [];

    for (const config of configs) {
      try {
        // Construct full path: sourceDir + relative config.path
        const fullPath = path.join(sourceDir, config.path);
        const content = await this.fsManager.readFile(fullPath);

        if (config.type === 'agent') {
          const validation = this.agentValidator.validate(content, config);
          if (!validation.valid) {
            errors.push({
              config,
              message: `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
              code: ErrorCode.VALIDATION_FAILED,
              context: { errors: validation.errors },
            });
          }
        } else if (config.type === 'skill') {
          const validation = this.skillValidator.validate(content, config);
          if (!validation.valid) {
            errors.push({
              config,
              message: `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
              code: ErrorCode.VALIDATION_FAILED,
              context: { errors: validation.errors },
            });
          }
        }
      } catch (error) {
        errors.push({
          config,
          message: error instanceof Error ? error.message : 'Validation error',
          code: ErrorCode.VALIDATION_FAILED,
        });
      }
    }

    result.errors.push(...errors);
  }

  /**
   * Detect changes between lockfile configs and discovered configs
   */
  private detectChanges(
    lockfileConfigs: Record<string, ConfigEntry>,
    discoveredConfigs: ConfigEntry[]
  ): {
    added: ConfigEntry[];
    updated: ConfigEntry[];
    removed: string[];
  } {
    const added: ConfigEntry[] = [];
    const updated: ConfigEntry[] = [];
    const removed: string[] = [];

    // Create a map for quick lookup
    const lockfileMap = new Map<string, ConfigEntry>(
      Object.entries(lockfileConfigs).map(([name, config]) => [name, config])
    );
    const discoveredMap = new Map<string, ConfigEntry>(
      discoveredConfigs.map((config) => [config.name, config])
    );

    // Find added and updated configs
    for (const config of discoveredConfigs) {
      const existing = lockfileMap.get(config.name);
      if (!existing) {
        added.push(config);
      } else if (existing.hash !== config.hash) {
        updated.push(config);
      }
    }

    // Find removed configs
    for (const [name] of lockfileMap) {
      if (!discoveredMap.has(name)) {
        removed.push(name);
      }
    }

    return { added, updated, removed };
  }

  /**
   * Detect conflicts with personal configurations
   */
  private async detectConflicts(
    configs: ConfigEntry[],
    scope: 'global' | 'project'
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (const config of configs) {
      const personalPath = path.join(
        getBaseConfigDir(scope),
        config.type,
        'personal',
        path.basename(config.path)
      );

      const exists = await this.fsManager.fileExists(personalPath);
      if (exists) {
        conflicts.push({
          name: config.name,
          type: config.type,
          team: config,
          personal: {
            ...config,
            path: personalPath,
          },
          resolution: 'personal', // Personal always takes precedence
        });
      }
    }

    return conflicts;
  }

  /**
   * Apply changes to the file system
   */
  private async applyChanges(
    sourceDir: string,
    changes: { added: ConfigEntry[]; updated: ConfigEntry[]; removed: string[] },
    scope: 'global' | 'project',
    forceTeam: boolean,
    result: SyncResult
  ): Promise<void> {
    const baseDir = getBaseConfigDir(scope);

    // Variable marked for future use
    void forceTeam; // Will be used for conflict resolution

    // Add new configurations
    for (const config of changes.added) {
      try {
        const destPath = path.join(baseDir, config.type, 'team', path.basename(config.path));
        await this.fsManager.ensureDir(path.dirname(destPath));

        // Construct full source path
        const sourcePath = path.join(sourceDir, config.path);

        // For skills, we need to copy the entire directory
        if (config.type === 'skill') {
          const sourceSkillDir = path.dirname(sourcePath);
          const destSkillDir = path.dirname(destPath);
          await this.copyDirectory(sourceSkillDir, destSkillDir);
        } else {
          await this.fsManager.copyFile(sourcePath, destPath);
        }

        result.added.push(config);
        this.logger.debug(`Added: ${config.name}`);
      } catch (error) {
        result.errors.push({
          config,
          message: error instanceof Error ? error.message : 'Failed to add configuration',
          code: ErrorCode.FS_COPY_ERROR,
        });
      }
    }

    // Update existing configurations
    for (const config of changes.updated) {
      try {
        const destPath = path.join(baseDir, config.type, 'team', path.basename(config.path));

        // Construct full source path
        const sourcePath = path.join(sourceDir, config.path);

        if (config.type === 'skill') {
          const sourceSkillDir = path.dirname(sourcePath);
          const destSkillDir = path.dirname(destPath);
          await this.copyDirectory(sourceSkillDir, destSkillDir);
        } else {
          await this.fsManager.copyFile(sourcePath, destPath);
        }

        result.updated.push(config);
        this.logger.debug(`Updated: ${config.name}`);
      } catch (error) {
        result.errors.push({
          config,
          message: error instanceof Error ? error.message : 'Failed to update configuration',
          code: ErrorCode.FS_COPY_ERROR,
        });
      }
    }

    // Remove configurations
    for (const name of changes.removed) {
      try {
        // Try to find and remove from both agent and skill directories
        const agentPath = path.join(baseDir, 'agent', 'team', `${name}.md`);
        const skillPath = path.join(baseDir, 'skill', 'team', name);

        if (await this.fsManager.fileExists(agentPath)) {
          await this.fsManager.removeFile(agentPath);
        } else if (await this.fsManager.isDirectory(skillPath)) {
          await this.fsManager.removeDir(skillPath);
        }

        result.removed.push(name);
        this.logger.debug(`Removed: ${name}`);
      } catch (error) {
        result.errors.push({
          message: `Failed to remove configuration: ${name}`,
          code: ErrorCode.FS_DELETE_ERROR,
        });
      }
    }
  }

  /**
   * Copy a directory recursively (for skills)
   */
  private async copyDirectory(source: string, dest: string): Promise<void> {
    await this.fsManager.ensureDir(dest);
    const entries = await this.fsManager.listFiles(source);

    for (const entry of entries) {
      const sourcePath = path.join(source, entry);
      const destPath = path.join(dest, entry);

      if (await this.fsManager.isDirectory(sourcePath)) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await this.fsManager.copyFile(sourcePath, destPath);
      }
    }
  }
}
