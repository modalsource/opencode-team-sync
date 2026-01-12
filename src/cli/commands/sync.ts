import { BaseCommand, type CommonOptions } from '../base-command.js';
import { GitManager } from '../../core/git/git-manager.js';
import { FileSystemManager } from '../../core/fs/fs-manager.js';
import { LockfileManager } from '../../core/lockfile/lockfile-manager.js';
import { SyncEngine } from '../../core/sync/sync-engine.js';
import { SyncNotInitializedError } from '../../utils/errors.js';
import { getLockfilePath, getTempDir } from '../../utils/path-utils.js';

/**
 * Options for sync command
 */
export interface SyncCommandOptions extends CommonOptions {
  /** Tags to include (OR logic) */
  tags?: string[];
  /** Tags to exclude */
  excludeTags?: string[];
  /** Dry run (preview only) */
  dryRun?: boolean;
  /** Force team configs to override personal */
  forceTeam?: boolean;
  /** Skip validation */
  noValidate?: boolean;
  /** Specific ref to sync */
  ref?: string;
}

/**
 * Sync command: Synchronize configurations from team repository
 */
export class SyncCommand extends BaseCommand<SyncCommandOptions> {
  private gitManager: GitManager;
  private fsManager: FileSystemManager;
  private lockfileManager: LockfileManager;
  private syncEngine: SyncEngine;

  constructor(options: SyncCommandOptions) {
    super(options);
    this.gitManager = new GitManager();
    this.fsManager = new FileSystemManager();
    this.lockfileManager = new LockfileManager();
    this.syncEngine = new SyncEngine();
  }

  /**
   * Validate prerequisites
   */
  protected async validate(): Promise<void> {
    // Check if initialized
    const scope = this.resolveScope();
    const lockfilePath = getLockfilePath(scope);

    if (!(await this.fsManager.fileExists(lockfilePath))) {
      throw new SyncNotInitializedError();
    }
  }

  /**
   * Execute the sync command
   */
  async execute(): Promise<void> {
    const {
      tags,
      excludeTags,
      dryRun = false,
      forceTeam = false,
      noValidate = false,
      ref,
    } = this.options;
    const scope = this.resolveScope();

    this.logger.info('Starting synchronization...');

    if (dryRun) {
      this.logger.info('Dry run mode: no changes will be made');
    }

    let tempDir: string | null = null;

    try {
      // 1. Read lockfile
      const lockfilePath = getLockfilePath(scope);
      const lockfile = await this.lockfileManager.read(lockfilePath);

      this.logger.info(`Repository: ${lockfile.repository}`);
      this.logger.info(`Current ref: ${lockfile.ref}`);

      // 2. Clone repository to temporary location
      tempDir = getTempDir();
      this.logger.info('Fetching latest configurations...');
      await this.gitManager.clone(lockfile.repository, tempDir);

      // 3. Checkout the ref (use provided ref or lockfile ref)
      const targetRef = ref || lockfile.ref;
      await this.gitManager.checkout(tempDir, targetRef);

      // 4. Get current commit
      const currentCommit = await this.gitManager.getCurrentCommit(tempDir);

      // Check if there are updates
      if (currentCommit === lockfile.commit && !tags && !excludeTags) {
        this.logger.info('Already up to date');
        return;
      }

      if (currentCommit !== lockfile.commit) {
        this.logger.info(`New commit available: ${currentCommit.substring(0, 7)}`);
      }

      // 5. Sync configurations
      const syncResult = await this.syncEngine.sync({
        sourceDir: tempDir,
        lockfile: {
          ...lockfile,
          tags: tags || lockfile.tags,
          excludeTags: excludeTags || lockfile.excludeTags,
        },
        options: {
          tags: tags || lockfile.tags,
          excludeTags: excludeTags || lockfile.excludeTags,
          dryRun,
          forceTeam,
          noValidate,
        },
      });

      // 6. Display results
      this.displayResults(syncResult);

      // 7. Update lockfile (if not dry run)
      if (!dryRun) {
        await this.lockfileManager.update(lockfilePath, {
          commit: currentCommit,
          lastSync: new Date().toISOString(),
          ref: targetRef,
          tags: tags || lockfile.tags,
          excludeTags: excludeTags || lockfile.excludeTags,
          configs: this.configsToRecord(syncResult),
        });

        this.logger.debug('Lockfile updated');
      }

      // 8. Cleanup
      if (tempDir) {
        await this.fsManager.removeDir(tempDir);
      }

      this.logger.info('Synchronization completed successfully!');
    } catch (error) {
      // Cleanup on error
      if (tempDir) {
        try {
          await this.fsManager.removeDir(tempDir);
        } catch {
          // Ignore cleanup errors
        }
      }

      throw error;
    }
  }

  /**
   * Convert sync result to lockfile configs record
   */
  private configsToRecord(syncResult: {
    added: any[];
    updated: any[];
    removed: string[];
  }): Record<string, any> {
    const record: Record<string, any> = {};

    // Add all added and updated configs
    for (const config of [...syncResult.added, ...syncResult.updated]) {
      record[config.name] = config;
    }

    return record;
  }

  /**
   * Display sync results
   */
  private displayResults(result: {
    added: any[];
    updated: any[];
    removed: string[];
    errors: any[];
    conflicts: any[];
  }): void {
    this.logger.info('');
    this.logger.info('Sync Results:');

    if (result.added.length > 0) {
      this.logger.info(`  Added: ${result.added.length} configurations`);
      if (this.options.verbose) {
        result.added.forEach((config) => {
          this.logger.info(`    + ${config.name} (${config.type})`);
        });
      }
    }

    if (result.updated.length > 0) {
      this.logger.info(`  Updated: ${result.updated.length} configurations`);
      if (this.options.verbose) {
        result.updated.forEach((config) => {
          this.logger.info(`    ~ ${config.name} (${config.type})`);
        });
      }
    }

    if (result.removed.length > 0) {
      this.logger.info(`  Removed: ${result.removed.length} configurations`);
      if (this.options.verbose) {
        result.removed.forEach((name) => {
          this.logger.info(`    - ${name}`);
        });
      }
    }

    if (result.conflicts.length > 0) {
      this.logger.warn(
        `  Conflicts: ${result.conflicts.length} (personal configs take precedence)`
      );
      if (this.options.verbose) {
        result.conflicts.forEach((conflict) => {
          this.logger.warn(`    ! ${conflict.name} (${conflict.type})`);
        });
      }
    }

    if (result.errors.length > 0) {
      this.logger.error(`  Errors: ${result.errors.length} configurations failed`);
      if (this.options.verbose) {
        result.errors.forEach((error) => {
          this.logger.error(`    ✗ ${error.config?.name || 'unknown'}: ${error.message}`);
        });
      }
    }

    if (result.added.length === 0 && result.updated.length === 0 && result.removed.length === 0) {
      this.logger.info('  No changes');
    }

    this.logger.info('');
  }
}
