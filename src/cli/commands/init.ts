import { BaseCommand, type CommonOptions } from '../base-command.js';
import { GitManager } from '../../core/git/git-manager.js';
import { FileSystemManager } from '../../core/fs/fs-manager.js';
import { LockfileManager } from '../../core/lockfile/lockfile-manager.js';
import { SyncEngine } from '../../core/sync/sync-engine.js';
import { DiscoveryEngine } from '../../core/discovery/discovery-engine.js';
import {
  SyncAlreadyInitializedError,
  SyncNoConfigsFoundError,
  GitError,
} from '../../utils/errors.js';
import { getLockfilePath, getTempDir } from '../../utils/path-utils.js';
import type { Lockfile, ConfigScope, ConfigEntry } from '../../types/index.js';

/**
 * Options for init command
 */
export interface InitCommandOptions extends CommonOptions {
  /** Repository URL */
  repository: string;
  /** Git ref (branch/tag/commit) */
  ref?: string;
  /** Scope of installation */
  scope?: ConfigScope;
  /** Initial tag filter */
  tags?: string[];
  /** Initial exclude tag filter */
  excludeTags?: string[];
  /** Force re-initialization */
  force?: boolean;
}

/**
 * Init command: Initialize team configurations from a repository
 */
export class InitCommand extends BaseCommand<InitCommandOptions> {
  private gitManager: GitManager;
  private fsManager: FileSystemManager;
  private lockfileManager: LockfileManager;
  private syncEngine: SyncEngine;
  private discoveryEngine: DiscoveryEngine;

  constructor(options: InitCommandOptions) {
    super(options);
    this.gitManager = new GitManager();
    this.fsManager = new FileSystemManager();
    this.lockfileManager = new LockfileManager();
    this.syncEngine = new SyncEngine();
    this.discoveryEngine = new DiscoveryEngine();
  }

  /**
   * Validate prerequisites
   */
  protected async validate(): Promise<void> {
    // Check if already initialized
    const scope = this.resolveScope();
    const lockfilePath = getLockfilePath(scope);

    if ((await this.fsManager.fileExists(lockfilePath)) && !this.options.force) {
      const lockfile = await this.lockfileManager.read(lockfilePath);
      throw new SyncAlreadyInitializedError(lockfile.repository);
    }
  }

  /**
   * Execute the init command
   */
  async execute(): Promise<void> {
    const { repository, ref = 'main', tags, excludeTags } = this.options;
    const scope = this.resolveScope();

    this.logger.info(`Initializing team configurations from: ${repository}`);

    let tempDir: string | null = null;

    try {
      // Check if already initialized (unless force flag is set)
      const lockfilePath = getLockfilePath(scope);
      if ((await this.fsManager.fileExists(lockfilePath)) && !this.options.force) {
        const lockfile = await this.lockfileManager.read(lockfilePath);
        throw new SyncAlreadyInitializedError(lockfile.repository);
      }

      // 1. Clone repository to temporary location
      tempDir = getTempDir();
      this.logger.info(`Cloning repository to temporary location...`);
      await this.gitManager.clone(repository, tempDir);

      // 2. Checkout specified ref
      if (ref) {
        this.logger.info(`Checking out ref: ${ref}`);
        await this.gitManager.checkout(tempDir, ref);
      }

      // 3. Get current commit SHA
      const commit = await this.gitManager.getCurrentCommit(tempDir);
      this.logger.debug(`Current commit: ${commit}`);

      // 4. Discover configurations
      this.logger.info('Discovering configurations...');
      const discoveryResult = await this.discoveryEngine.discover({
        baseDir: tempDir,
        computeHash: true,
        validate: true,
      });

      if (discoveryResult.configs.length === 0) {
        throw new SyncNoConfigsFoundError(repository);
      }

      this.logger.info(`Found ${discoveryResult.configs.length} configurations`);

      // 5. Create initial lockfile with empty configs (will be populated after sync)
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository,
        ref,
        commit,
        scope,
        lastSync: new Date().toISOString(),
        tags,
        excludeTags,
        configs: {}, // Empty initially - will be populated after sync
      };

      // Reuse lockfilePath from earlier
      await this.lockfileManager.write(lockfilePath, lockfile);
      this.logger.debug('Initial lockfile created');

      // 6. Perform initial sync
      this.logger.info('Syncing configurations...');
      const syncResult = await this.syncEngine.sync({
        sourceDir: tempDir,
        lockfile,
        options: {
          tags,
          excludeTags,
          dryRun: false,
          noValidate: false,
        },
      });

      // 7. Update lockfile with synced configurations
      lockfile.configs = this.configsToRecord(syncResult.added);
      lockfile.lastSync = new Date().toISOString();
      await this.lockfileManager.write(lockfilePath, lockfile);
      this.logger.debug('Lockfile updated with synced configs');

      // 8. Display results
      this.displayResults(
        syncResult.added.length,
        syncResult.errors.length,
        syncResult.conflicts.length
      );

      // 9. Cleanup
      this.logger.debug('Cleaning up temporary files...');
      if (tempDir) {
        await this.fsManager.removeDir(tempDir);
      }

      this.logger.info('Initialization completed successfully!');
      this.logger.info(`Run 'oct status' to see the current state`);
    } catch (error) {
      // Cleanup on error
      if (tempDir) {
        try {
          await this.fsManager.removeDir(tempDir);
        } catch {
          // Ignore cleanup errors
        }
      }

      if (error instanceof GitError) {
        this.logger.error(`Git operation failed: ${error.message}`);
        this.logger.error('Make sure the repository URL is correct and you have access');
      } else if (error instanceof Error) {
        this.logger.error(`Initialization failed: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Convert configs array to record for lockfile
   */
  private configsToRecord(configs: ConfigEntry[]): Record<string, ConfigEntry> {
    const record: Record<string, ConfigEntry> = {};
    for (const config of configs) {
      record[config.name] = config;
    }
    return record;
  }

  /**
   * Display sync results
   */
  private displayResults(added: number, errors: number, conflicts: number): void {
    this.logger.info('');
    this.logger.info('Sync Results:');
    this.logger.info(`  Added: ${added} configurations`);

    if (conflicts > 0) {
      this.logger.warn(`  Conflicts: ${conflicts} (personal configs take precedence)`);
    }

    if (errors > 0) {
      this.logger.error(`  Errors: ${errors} configurations failed`);
    }

    this.logger.info('');
  }
}
