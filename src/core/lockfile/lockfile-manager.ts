import YAML from 'yaml';
import { FileSystemManager } from '../fs/fs-manager.js';
import { LockfileSchema } from '../../schemas/index.js';
import type {
  Lockfile,
  ValidationResult,
  ValidationIssue,
  ConfigEntry,
} from '../../types/index.js';
import { FileNotFoundError, ValidationError, ErrorCode } from '../../utils/errors.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Lockfile manager
 * Handles lockfile operations including read, write, update, and validation
 */
export class LockfileManager {
  private logger = getLogger();
  private fsManager: FileSystemManager;

  constructor(fsManager?: FileSystemManager) {
    this.fsManager = fsManager ?? new FileSystemManager();
  }

  /**
   * Read and parse a lockfile
   * @param path - Path to the lockfile
   * @returns Parsed lockfile object
   * @throws FileNotFoundError if lockfile doesn't exist
   * @throws FileReadError if lockfile cannot be read
   * @throws ValidationError if lockfile is invalid
   */
  async read(path: string): Promise<Lockfile> {
    this.logger.debug(`Reading lockfile: ${path}`);

    // Check if file exists
    const exists = await this.fsManager.fileExists(path);
    if (!exists) {
      throw new FileNotFoundError(path);
    }

    try {
      // Read file content
      const content = await this.fsManager.readFile(path);

      // Parse YAML
      let parsed: unknown;
      try {
        parsed = YAML.parse(content);
      } catch (error) {
        throw new ValidationError(
          `Failed to parse lockfile YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ErrorCode.VALIDATION_LOCKFILE_ERROR,
          { path, parseError: error instanceof Error ? error.message : 'Unknown error' }
        );
      }

      // Validate schema
      const result = LockfileSchema.safeParse(parsed);
      if (!result.success) {
        const errors = result.error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new ValidationError(
          `Invalid lockfile format: ${errors}`,
          ErrorCode.VALIDATION_LOCKFILE_ERROR,
          { path, errors: result.error.errors }
        );
      }

      this.logger.debug('Lockfile read successfully');
      return result.data as Lockfile;
    } catch (error) {
      if (error instanceof FileNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to read lockfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCode.VALIDATION_LOCKFILE_ERROR,
        { path }
      );
    }
  }

  /**
   * Write a lockfile to disk
   * @param path - Path to write the lockfile to
   * @param lockfile - Lockfile object to write
   * @throws ValidationError if lockfile is invalid
   * @throws FileWriteError if lockfile cannot be written
   */
  async write(path: string, lockfile: Lockfile): Promise<void> {
    this.logger.debug(`Writing lockfile: ${path}`);

    // Validate lockfile before writing
    const validation = this.validate(lockfile);
    if (!validation.valid) {
      const errors = validation.errors.map((e) => e.message).join(', ');
      throw new ValidationError(
        `Cannot write invalid lockfile: ${errors}`,
        ErrorCode.VALIDATION_LOCKFILE_ERROR,
        { path, errors: validation.errors }
      );
    }

    try {
      // Serialize to YAML with nice formatting
      const yaml = YAML.stringify(lockfile, {
        indent: 2,
        lineWidth: 100,
        minContentWidth: 40,
      });

      // Write to file
      await this.fsManager.writeFile(path, yaml);
      this.logger.debug('Lockfile written successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to write lockfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCode.VALIDATION_LOCKFILE_ERROR,
        { path }
      );
    }
  }

  /**
   * Update an existing lockfile with partial updates
   * @param path - Path to the lockfile
   * @param updates - Partial lockfile updates
   * @returns Updated lockfile
   * @throws FileNotFoundError if lockfile doesn't exist
   * @throws ValidationError if updated lockfile is invalid
   * @throws FileWriteError if lockfile cannot be written
   */
  async update(path: string, updates: Partial<Lockfile>): Promise<Lockfile> {
    this.logger.debug(`Updating lockfile: ${path}`);

    // Read existing lockfile
    const existing = await this.read(path);

    // Merge updates
    const updated: Lockfile = {
      ...existing,
      ...updates,
      // Deep merge configs if provided
      configs: updates.configs ? { ...existing.configs, ...updates.configs } : existing.configs,
    };

    // Update lastSync timestamp
    updated.lastSync = new Date().toISOString();

    // Write updated lockfile
    await this.write(path, updated);

    this.logger.debug('Lockfile updated successfully');
    return updated;
  }

  /**
   * Validate a lockfile object
   * @param lockfile - Lockfile to validate
   * @returns Validation result
   */
  validate(lockfile: Lockfile): ValidationResult {
    this.logger.debug('Validating lockfile');

    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Validate using Zod schema
    const result = LockfileSchema.safeParse(lockfile);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        errors.push({
          path: err.path.join('.'),
          message: err.message,
        });
      });
    }

    // Additional semantic validation
    if (result.success) {
      const data = result.data as Lockfile;

      // Check if version is supported (currently only 1.0.0)
      if (!data.version.startsWith('1.')) {
        errors.push({
          path: 'version',
          message: `Unsupported lockfile version: ${data.version}`,
        });
      }

      // Validate commit SHA format (should be 40 hex characters)
      if (!/^[a-f0-9]{40}$/i.test(data.commit)) {
        warnings.push({
          path: 'commit',
          message: `Commit SHA may be invalid: ${data.commit}`,
        });
      }

      // Validate lastSync timestamp
      const lastSyncDate = new Date(data.lastSync);
      if (isNaN(lastSyncDate.getTime())) {
        errors.push({
          path: 'lastSync',
          message: `Invalid lastSync timestamp: ${data.lastSync}`,
        });
      }

      // Warn if lastSync is in the future
      if (lastSyncDate.getTime() > Date.now()) {
        warnings.push({
          path: 'lastSync',
          message: 'lastSync timestamp is in the future',
        });
      }

      // Validate configs
      Object.entries(data.configs).forEach(([key, config]) => {
        // Check if key matches config name
        if (key !== config.name) {
          errors.push({
            path: `configs.${key}`,
            message: `Config key "${key}" does not match config name "${config.name}"`,
          });
        }

        // Validate hash format (SHA-256 should be 64 hex characters)
        if (!/^[a-f0-9]{64}$/i.test(config.hash)) {
          warnings.push({
            path: `configs.${key}.hash`,
            message: `Hash may be invalid: ${config.hash}`,
          });
        }
      });

      // Warn if no configs are present
      if (Object.keys(data.configs).length === 0) {
        warnings.push({
          path: 'configs',
          message: 'Lockfile contains no configurations',
        });
      }
    }

    const valid = errors.length === 0;
    this.logger.debug(`Lockfile validation ${valid ? 'passed' : 'failed'}`);

    // Create a minimal ConfigEntry for the validation result
    // Since we're validating the lockfile itself, not a specific config,
    // we use a placeholder
    const placeholderConfig: ConfigEntry = {
      path: '',
      type: 'agent',
      name: 'lockfile',
      hash: '',
      tags: [],
    };

    return {
      valid,
      config: placeholderConfig,
      errors,
      warnings,
    };
  }

  /**
   * Check if a lockfile exists at the given path
   * @param path - Path to check
   * @returns True if lockfile exists
   */
  async exists(path: string): Promise<boolean> {
    return await this.fsManager.fileExists(path);
  }

  /**
   * Delete a lockfile
   * @param path - Path to the lockfile
   */
  async remove(path: string): Promise<void> {
    this.logger.debug(`Removing lockfile: ${path}`);
    await this.fsManager.removeFile(path);
    this.logger.debug('Lockfile removed successfully');
  }

  /**
   * Create a new lockfile with initial values
   * @param path - Path to write the lockfile
   * @param repository - Repository URL
   * @param ref - Git ref
   * @param commit - Git commit SHA
   * @param scope - Installation scope
   * @param tags - Optional tag filters
   * @param excludeTags - Optional exclude tag filters
   * @returns Created lockfile
   */
  async create(
    path: string,
    repository: string,
    ref: string,
    commit: string,
    scope: 'global' | 'project',
    tags?: string[],
    excludeTags?: string[]
  ): Promise<Lockfile> {
    this.logger.debug(`Creating new lockfile: ${path}`);

    const lockfile: Lockfile = {
      version: '1.0.0',
      repository,
      ref,
      commit,
      scope,
      lastSync: new Date().toISOString(),
      tags,
      excludeTags,
      configs: {},
    };

    await this.write(path, lockfile);
    this.logger.debug('Lockfile created successfully');

    return lockfile;
  }

  /**
   * Add or update a configuration in the lockfile
   * @param path - Path to the lockfile
   * @param config - Configuration to add/update
   */
  async addConfig(path: string, config: ConfigEntry): Promise<void> {
    this.logger.debug(`Adding config to lockfile: ${config.name}`);

    const lockfile = await this.read(path);
    lockfile.configs[config.name] = config;
    lockfile.lastSync = new Date().toISOString();

    await this.write(path, lockfile);
    this.logger.debug('Config added successfully');
  }

  /**
   * Remove a configuration from the lockfile
   * @param path - Path to the lockfile
   * @param configName - Name of the configuration to remove
   */
  async removeConfig(path: string, configName: string): Promise<void> {
    this.logger.debug(`Removing config from lockfile: ${configName}`);

    const lockfile = await this.read(path);
    delete lockfile.configs[configName];
    lockfile.lastSync = new Date().toISOString();

    await this.write(path, lockfile);
    this.logger.debug('Config removed successfully');
  }
}
