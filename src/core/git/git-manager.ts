import simpleGit, { type SimpleGit, type SimpleGitOptions } from 'simple-git';
import {
  GitCloneError,
  GitFetchError,
  GitCheckoutError,
  GitInvalidRefError,
  GitAuthError,
} from '../../utils/errors.js';
import { getLogger } from '../../utils/logger.js';
import { GIT_TIMEOUT } from '../../utils/constants.js';

/**
 * Git operations manager
 * Handles all Git-related operations using simple-git
 */
export class GitManager {
  private git: SimpleGit;
  private logger = getLogger();

  constructor(options?: Partial<SimpleGitOptions>) {
    this.git = simpleGit({
      baseDir: process.cwd(),
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
      timeout: {
        block: GIT_TIMEOUT,
      },
      ...options,
    });
  }

  /**
   * Clone a repository to a destination
   */
  async clone(url: string, destination: string, options?: { depth?: number }): Promise<void> {
    this.logger.debug(`Cloning repository: ${url} to ${destination}`);
    try {
      const cloneOptions = options?.depth ? ['--depth', String(options.depth)] : [];
      await this.git.clone(url, destination, cloneOptions);
      this.logger.debug('Repository cloned successfully');
    } catch (error) {
      if (error instanceof Error) {
        // Check for authentication errors
        if (
          error.message.includes('Authentication failed') ||
          error.message.includes('could not read Username')
        ) {
          throw new GitAuthError(url, error);
        }
        throw new GitCloneError(url, error);
      }
      throw error;
    }
  }

  /**
   * Fetch updates from remote
   */
  async fetch(repoPath: string): Promise<void> {
    this.logger.debug(`Fetching repository: ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      await git.fetch(['--all', '--tags']);
      this.logger.debug('Repository fetched successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new GitFetchError(repoPath, error);
      }
      throw error;
    }
  }

  /**
   * Checkout a specific ref (branch, tag, or commit)
   */
  async checkout(repoPath: string, ref: string): Promise<void> {
    this.logger.debug(`Checking out ref: ${ref} in ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      await git.checkout(ref);
      this.logger.debug('Checkout successful');
    } catch (error) {
      if (error instanceof Error) {
        // Check if the ref doesn't exist
        if (error.message.includes('pathspec') || error.message.includes('did not match')) {
          throw new GitInvalidRefError(ref);
        }
        throw new GitCheckoutError(ref, error);
      }
      throw error;
    }
  }

  /**
   * Get the current commit SHA
   */
  async getCurrentCommit(repoPath: string): Promise<string> {
    this.logger.debug(`Getting current commit for: ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      const log = await git.log(['-1']);
      const commit = log.latest?.hash;
      if (!commit) {
        throw new Error('Could not determine current commit');
      }
      this.logger.debug(`Current commit: ${commit}`);
      return commit;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get current commit: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List all tags in the repository
   */
  async listTags(repoPath: string): Promise<string[]> {
    this.logger.debug(`Listing tags for: ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      const tags = await git.tags();
      this.logger.debug(`Found ${tags.all.length} tags`);
      return tags.all;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list tags: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List all branches in the repository
   */
  async listBranches(repoPath: string): Promise<string[]> {
    this.logger.debug(`Listing branches for: ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      const branches = await git.branch();
      this.logger.debug(`Found ${branches.all.length} branches`);
      return branches.all;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list branches: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if the repository has uncommitted changes
   */
  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    this.logger.debug(`Checking for uncommitted changes in: ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      const status = await git.status();
      const hasChanges = !status.isClean();
      this.logger.debug(`Has uncommitted changes: ${hasChanges}`);
      return hasChanges;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to check status: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get commits between two refs
   */
  async getCommitsBetween(
    repoPath: string,
    fromRef: string,
    toRef: string
  ): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
    this.logger.debug(`Getting commits between ${fromRef} and ${toRef}`);
    try {
      const git = simpleGit(repoPath);
      const log = await git.log({ from: fromRef, to: toRef });
      return log.all.map((commit) => ({
        sha: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get commits: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a path is a git repository
   */
  async isRepository(path: string): Promise<boolean> {
    try {
      const git = simpleGit(path);
      await git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the remote URL of the repository
   */
  async getRemoteUrl(repoPath: string): Promise<string | null> {
    this.logger.debug(`Getting remote URL for: ${repoPath}`);
    try {
      const git = simpleGit(repoPath);
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin');
      return origin?.refs.fetch || null;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.debug(`Failed to get remote URL: ${error.message}`);
      }
      return null;
    }
  }
}
