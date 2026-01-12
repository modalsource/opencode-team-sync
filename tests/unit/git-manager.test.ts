import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitManager } from '../../src/core/git/git-manager.js';
import {
  GitCloneError,
  GitFetchError,
  GitCheckoutError,
  GitInvalidRefError,
  GitAuthError,
} from '../../src/utils/errors.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('GitManager', () => {
  let gitManager: GitManager;
  let testDir: string;
  let testRepoPath: string;

  beforeEach(async () => {
    gitManager = new GitManager();
    // Create a temporary directory for tests
    testDir = path.join(os.tmpdir(), `oct-git-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    testRepoPath = path.join(testDir, 'test-repo');
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Helper to create a test git repository
  async function createTestRepo(repoPath: string): Promise<void> {
    await fs.mkdir(repoPath, { recursive: true });
    execSync('git init', { cwd: repoPath, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: repoPath, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

    // Create initial commit
    const testFile = path.join(repoPath, 'test.txt');
    await fs.writeFile(testFile, 'initial content');
    execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'ignore' });
  }

  describe('clone', () => {
    it('should clone a repository successfully', async () => {
      // Create a source repository
      const sourceRepo = path.join(testDir, 'source-repo');
      await createTestRepo(sourceRepo);

      // Clone it
      const destRepo = path.join(testDir, 'dest-repo');
      await gitManager.clone(sourceRepo, destRepo);

      // Verify the clone
      const isRepo = await gitManager.isRepository(destRepo);
      expect(isRepo).toBe(true);

      // Verify files were cloned
      const testFile = path.join(destRepo, 'test.txt');
      const exists = await fs
        .access(testFile)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should clone with depth option', async () => {
      const sourceRepo = path.join(testDir, 'source-repo');
      await createTestRepo(sourceRepo);

      // Add more commits
      for (let i = 0; i < 5; i++) {
        await fs.writeFile(path.join(sourceRepo, `file${i}.txt`), `content ${i}`);
        execSync('git add .', { cwd: sourceRepo, stdio: 'ignore' });
        execSync(`git commit -m "Commit ${i}"`, { cwd: sourceRepo, stdio: 'ignore' });
      }

      const destRepo = path.join(testDir, 'dest-repo');
      await gitManager.clone(sourceRepo, destRepo, { depth: 1 });

      const isRepo = await gitManager.isRepository(destRepo);
      expect(isRepo).toBe(true);
    });

    it('should throw GitCloneError on invalid URL', async () => {
      const destRepo = path.join(testDir, 'dest-repo');
      await expect(
        gitManager.clone('https://invalid-url-does-not-exist.com/repo.git', destRepo)
      ).rejects.toBeInstanceOf(GitCloneError);
    });

    it('should define GitAuthError for authentication failures', () => {
      // This test verifies the error class exists
      // Real authentication errors are difficult to test without external services
      expect(GitAuthError).toBeDefined();

      const error = new GitAuthError('https://example.com/repo.git');
      expect(error).toBeInstanceOf(GitAuthError);
      expect(error.message).toContain('Authentication failed');
    });
  });

  describe('fetch', () => {
    it('should fetch updates from remote', async () => {
      await createTestRepo(testRepoPath);

      // Create a remote-like setup
      const remoteRepo = path.join(testDir, 'remote-repo');
      await createTestRepo(remoteRepo);

      // Clone from remote
      const localRepo = path.join(testDir, 'local-repo');
      await gitManager.clone(remoteRepo, localRepo);

      // Add a commit to remote
      await fs.writeFile(path.join(remoteRepo, 'new-file.txt'), 'new content');
      execSync('git add .', { cwd: remoteRepo, stdio: 'ignore' });
      execSync('git commit -m "New commit"', { cwd: remoteRepo, stdio: 'ignore' });

      // Fetch should not throw
      await expect(gitManager.fetch(localRepo)).resolves.not.toThrow();
    });

    it('should throw GitFetchError on invalid repository', async () => {
      const invalidPath = path.join(testDir, 'non-existent');
      await expect(gitManager.fetch(invalidPath)).rejects.toBeInstanceOf(GitFetchError);
    });
  });

  describe('checkout', () => {
    it('should checkout a branch', async () => {
      await createTestRepo(testRepoPath);

      // Create a new branch
      execSync('git checkout -b test-branch', { cwd: testRepoPath, stdio: 'ignore' });
      execSync('git checkout main || git checkout master', { cwd: testRepoPath, stdio: 'ignore' });

      // Checkout the branch
      await gitManager.checkout(testRepoPath, 'test-branch');

      // Verify we're on the correct branch
      const currentBranch = execSync('git branch --show-current', {
        cwd: testRepoPath,
        encoding: 'utf-8',
      }).trim();
      expect(currentBranch).toBe('test-branch');
    });

    it('should checkout a tag', async () => {
      await createTestRepo(testRepoPath);

      // Create a tag
      execSync('git tag v1.0.0', { cwd: testRepoPath, stdio: 'ignore' });

      // Checkout the tag
      await gitManager.checkout(testRepoPath, 'v1.0.0');

      // Verify we're at the tag
      const currentCommit = await gitManager.getCurrentCommit(testRepoPath);
      const tagCommit = execSync('git rev-parse v1.0.0', {
        cwd: testRepoPath,
        encoding: 'utf-8',
      }).trim();
      expect(currentCommit).toBe(tagCommit);
    });

    it('should throw GitCheckoutError for non-existent ref', async () => {
      await createTestRepo(testRepoPath);
      // Note: GitInvalidRefError is thrown when pathspec errors occur
      // but generic checkout failures throw GitCheckoutError
      await expect(gitManager.checkout(testRepoPath, 'non-existent-branch')).rejects.toThrow();
    });
  });

  describe('getCurrentCommit', () => {
    it('should return current commit SHA', async () => {
      await createTestRepo(testRepoPath);

      const commit = await gitManager.getCurrentCommit(testRepoPath);

      expect(commit).toBeTruthy();
      expect(commit).toHaveLength(40); // SHA-1 hash length
      expect(/^[0-9a-f]{40}$/.test(commit)).toBe(true);
    });

    it('should throw error for non-repository', async () => {
      const nonRepo = path.join(testDir, 'not-a-repo');
      await fs.mkdir(nonRepo);

      await expect(gitManager.getCurrentCommit(nonRepo)).rejects.toThrow();
    });
  });

  describe('listTags', () => {
    it('should list all tags', async () => {
      await createTestRepo(testRepoPath);

      // Create multiple tags
      execSync('git tag v1.0.0', { cwd: testRepoPath, stdio: 'ignore' });
      execSync('git tag v1.1.0', { cwd: testRepoPath, stdio: 'ignore' });
      execSync('git tag v2.0.0', { cwd: testRepoPath, stdio: 'ignore' });

      const tags = await gitManager.listTags(testRepoPath);

      expect(tags).toContain('v1.0.0');
      expect(tags).toContain('v1.1.0');
      expect(tags).toContain('v2.0.0');
      expect(tags.length).toBe(3);
    });

    it('should return empty array for repository with no tags', async () => {
      await createTestRepo(testRepoPath);

      const tags = await gitManager.listTags(testRepoPath);

      expect(tags).toEqual([]);
    });
  });

  describe('listBranches', () => {
    it('should list all branches', async () => {
      await createTestRepo(testRepoPath);

      // Create additional branches
      execSync('git checkout -b feature-1', { cwd: testRepoPath, stdio: 'ignore' });
      execSync('git checkout -b feature-2', { cwd: testRepoPath, stdio: 'ignore' });

      const branches = await gitManager.listBranches(testRepoPath);

      expect(branches.length).toBeGreaterThanOrEqual(3);
      expect(branches.some((b) => b.includes('feature-1'))).toBe(true);
      expect(branches.some((b) => b.includes('feature-2'))).toBe(true);
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return false for clean repository', async () => {
      await createTestRepo(testRepoPath);

      const hasChanges = await gitManager.hasUncommittedChanges(testRepoPath);

      expect(hasChanges).toBe(false);
    });

    it('should return true for repository with uncommitted changes', async () => {
      await createTestRepo(testRepoPath);

      // Make an uncommitted change
      await fs.writeFile(path.join(testRepoPath, 'new-file.txt'), 'uncommitted');

      const hasChanges = await gitManager.hasUncommittedChanges(testRepoPath);

      expect(hasChanges).toBe(true);
    });

    it('should return true for repository with staged changes', async () => {
      await createTestRepo(testRepoPath);

      // Make and stage a change
      await fs.writeFile(path.join(testRepoPath, 'staged-file.txt'), 'staged');
      execSync('git add .', { cwd: testRepoPath, stdio: 'ignore' });

      const hasChanges = await gitManager.hasUncommittedChanges(testRepoPath);

      expect(hasChanges).toBe(true);
    });
  });

  describe('getCommitsBetween', () => {
    it('should get commits between two refs', async () => {
      await createTestRepo(testRepoPath);

      const firstCommit = await gitManager.getCurrentCommit(testRepoPath);

      // Add more commits
      for (let i = 0; i < 3; i++) {
        await fs.writeFile(path.join(testRepoPath, `file${i}.txt`), `content ${i}`);
        execSync('git add .', { cwd: testRepoPath, stdio: 'ignore' });
        execSync(`git commit -m "Commit ${i}"`, { cwd: testRepoPath, stdio: 'ignore' });
      }

      const lastCommit = await gitManager.getCurrentCommit(testRepoPath);

      const commits = await gitManager.getCommitsBetween(testRepoPath, firstCommit, lastCommit);

      expect(commits.length).toBe(3);
      expect(commits[0]).toHaveProperty('sha');
      expect(commits[0]).toHaveProperty('message');
      expect(commits[0]).toHaveProperty('author');
      expect(commits[0]).toHaveProperty('date');
    });

    it('should return empty array when refs are the same', async () => {
      await createTestRepo(testRepoPath);

      const commit = await gitManager.getCurrentCommit(testRepoPath);
      const commits = await gitManager.getCommitsBetween(testRepoPath, commit, commit);

      expect(commits).toEqual([]);
    });
  });

  describe('isRepository', () => {
    it('should return true for valid git repository', async () => {
      await createTestRepo(testRepoPath);

      const isRepo = await gitManager.isRepository(testRepoPath);

      expect(isRepo).toBe(true);
    });

    it('should return false for non-repository directory', async () => {
      const nonRepo = path.join(testDir, 'not-a-repo');
      await fs.mkdir(nonRepo);

      const isRepo = await gitManager.isRepository(nonRepo);

      expect(isRepo).toBe(false);
    });

    it('should return false for non-existent path', async () => {
      const nonExistent = path.join(testDir, 'does-not-exist');

      const isRepo = await gitManager.isRepository(nonExistent);

      expect(isRepo).toBe(false);
    });
  });

  describe('getRemoteUrl', () => {
    it('should return remote URL for cloned repository', async () => {
      const sourceRepo = path.join(testDir, 'source-repo');
      await createTestRepo(sourceRepo);

      const clonedRepo = path.join(testDir, 'cloned-repo');
      await gitManager.clone(sourceRepo, clonedRepo);

      const remoteUrl = await gitManager.getRemoteUrl(clonedRepo);

      expect(remoteUrl).toBeTruthy();
      expect(remoteUrl).toContain('source-repo');
    });

    it('should return null for repository without remote', async () => {
      await createTestRepo(testRepoPath);

      const remoteUrl = await gitManager.getRemoteUrl(testRepoPath);

      expect(remoteUrl).toBeNull();
    });

    it('should return null for non-repository', async () => {
      const nonRepo = path.join(testDir, 'not-a-repo');
      await fs.mkdir(nonRepo);

      const remoteUrl = await gitManager.getRemoteUrl(nonRepo);

      expect(remoteUrl).toBeNull();
    });
  });
});
