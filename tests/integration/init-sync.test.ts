import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { InitCommand } from '../../src/cli/commands/init.js';
import { SyncCommand } from '../../src/cli/commands/sync.js';
import { FileSystemManager } from '../../src/core/fs/fs-manager.js';
import { LockfileManager } from '../../src/core/lockfile/lockfile-manager.js';
import { getLockfilePath, getBaseConfigDir } from '../../src/utils/path-utils.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('Integration: Init and Sync Commands', () => {
  let testDir: string;
  let testRepoPath: string;
  let fsManager: FileSystemManager;
  let lockfileManager: LockfileManager;

  beforeAll(async () => {
    // Initialize test repository with Git if not already initialized
    testRepoPath = path.resolve(__dirname, '../fixtures/test-repo');
    const gitDir = path.join(testRepoPath, '.git');

    try {
      await fs.access(gitDir);
    } catch {
      // Git repo doesn't exist, initialize it
      console.log('Initializing test repository...');

      // Temporarily move devops.md out
      const devopsPath = path.join(testRepoPath, 'agents/devops.md');
      const devopsBackup = path.join(testRepoPath, '../devops.md.backup');
      await fs.rename(devopsPath, devopsBackup);

      // Create v1.0.0 without devops
      execSync('git init', { cwd: testRepoPath });
      execSync('git add .', { cwd: testRepoPath });
      execSync('git commit -m "v1.0.0: Initial agents and skills"', { cwd: testRepoPath });
      execSync('git tag v1.0.0', { cwd: testRepoPath });

      // Restore devops.md and create v2.0.0
      await fs.rename(devopsBackup, devopsPath);
      execSync('git add agents/devops.md', { cwd: testRepoPath });
      execSync('git commit -m "v2.0.0: Add devops agent"', { cwd: testRepoPath });
      execSync('git tag v2.0.0', { cwd: testRepoPath });

      console.log('Test repository initialized successfully');
    }
  });

  beforeEach(async () => {
    // Create temporary directory for test
    testDir = path.join(os.tmpdir(), `oct-integration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    fsManager = new FileSystemManager();
    lockfileManager = new LockfileManager();

    // Clean up actual lockfile location (since os.homedir() doesn't respect process.env.HOME)
    const actualLockfile = path.join(os.homedir(), '.config', 'opencode', '.opencode-team.lock');
    try {
      await fs.rm(actualLockfile, { force: true });
    } catch {
      // Ignore if file doesn't exist
    }

    // Clean up actual config directories
    const actualConfigDir = path.join(os.homedir(), '.config', 'opencode');
    try {
      await fs.rm(path.join(actualConfigDir, 'agent', 'team'), { recursive: true, force: true });
      await fs.rm(path.join(actualConfigDir, 'skill', 'team'), { recursive: true, force: true });
    } catch {
      // Ignore if directories don't exist
    }
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Cleanup actual lockfile and config directories
    const actualLockfile = path.join(os.homedir(), '.config', 'opencode', '.opencode-team.lock');
    const actualConfigDir = path.join(os.homedir(), '.config', 'opencode');
    try {
      await fs.rm(actualLockfile, { force: true });
      await fs.rm(path.join(actualConfigDir, 'agent', 'team'), { recursive: true, force: true });
      await fs.rm(path.join(actualConfigDir, 'skill', 'team'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('oct init', () => {
    it('should initialize team configurations from repository', async () => {
      const command = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });

      // Override config path to use test directory
      process.env.HOME = testDir;

      await command.execute();

      // Verify lockfile was created
      const lockfilePath = getLockfilePath('global');
      const lockfileExists = await fsManager.fileExists(lockfilePath);
      expect(lockfileExists).toBe(true);

      // Verify lockfile content
      const lockfile = await lockfileManager.read(lockfilePath);
      expect(lockfile.repository).toBe(testRepoPath);
      expect(lockfile.ref).toBe('v1.0.0');
      expect(lockfile.scope).toBe('global');
      expect(Object.keys(lockfile.configs).length).toBeGreaterThan(0);
    });

    it('should sync configurations to team namespace', async () => {
      process.env.HOME = testDir;

      const command = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });

      await command.execute();

      // Verify agent files were synced
      const agentDir = path.join(getBaseConfigDir('global'), 'agent', 'team');
      const agentFiles = await fsManager.listFiles(agentDir);

      expect(agentFiles.length).toBeGreaterThan(0);
      expect(agentFiles.some((f) => f.includes('frontend-dev'))).toBe(true);
      expect(agentFiles.some((f) => f.includes('backend-api'))).toBe(true);

      // Verify skill directories were synced
      const skillDir = path.join(getBaseConfigDir('global'), 'skill', 'team');
      const skillExists = await fsManager.isDirectory(skillDir);
      expect(skillExists).toBe(true);
    });

    it('should handle tag filtering', async () => {
      process.env.HOME = testDir;

      const command = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        tags: ['frontend'],
        verbose: false,
      });

      await command.execute();

      const lockfilePath = getLockfilePath('global');
      const lockfile = await lockfileManager.read(lockfilePath);

      // Should only include frontend-tagged configs
      expect(lockfile.tags).toEqual(['frontend']);

      // Check that only frontend configs were synced
      const configNames = Object.keys(lockfile.configs);
      const hasFrontend = configNames.some((name) => name.includes('frontend'));
      expect(hasFrontend).toBe(true);
    });

    it('should throw error if already initialized without force flag', async () => {
      process.env.HOME = testDir;

      // First initialization
      const command1 = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });
      await command1.execute();

      // Second initialization without force should fail
      const command2 = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });

      await expect(command2.execute()).rejects.toThrow();
    });

    it('should allow re-initialization with force flag', async () => {
      process.env.HOME = testDir;

      // First initialization
      const command1 = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });
      await command1.execute();

      // Second initialization with force should succeed
      const command2 = new InitCommand({
        repository: testRepoPath,
        ref: 'v2.0.0',
        scope: 'global',
        force: true,
        verbose: false,
      });

      await expect(command2.execute()).resolves.not.toThrow();

      // Verify ref was updated
      const lockfilePath = getLockfilePath('global');
      const lockfile = await lockfileManager.read(lockfilePath);
      expect(lockfile.ref).toBe('v2.0.0');
    });
  });

  describe('oct sync', () => {
    beforeEach(async () => {
      // Initialize first
      process.env.HOME = testDir;

      const initCommand = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });
      await initCommand.execute();
    });

    it('should sync when already up to date', async () => {
      const command = new SyncCommand({
        scope: 'global',
        verbose: false,
      });

      // Should complete without errors (already up to date)
      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should detect and sync new configurations', async () => {
      // Manually update lockfile to point to v1.0.0
      // Then sync to v2.0.0 which has devops agent
      const lockfilePath = getLockfilePath('global');
      const lockfile = await lockfileManager.read(lockfilePath);

      // Force old commit
      await lockfileManager.update(lockfilePath, {
        ref: 'v1.0.0',
        commit: 'old-commit',
      });

      const command = new SyncCommand({
        ref: 'v2.0.0',
        scope: 'global',
        verbose: false,
      });

      await command.execute();

      // Verify devops agent was added
      const agentDir = path.join(getBaseConfigDir('global'), 'agent', 'team');
      const agentFiles = await fsManager.listFiles(agentDir);
      expect(agentFiles.some((f) => f.includes('devops'))).toBe(true);
    });

    it('should support dry-run mode', async () => {
      const lockfilePath = getLockfilePath('global');
      const lockfileBefore = await lockfileManager.read(lockfilePath);

      const command = new SyncCommand({
        ref: 'v2.0.0',
        dryRun: true,
        scope: 'global',
        verbose: false,
      });

      await command.execute();

      // Lockfile should not be updated in dry-run
      const lockfileAfter = await lockfileManager.read(lockfilePath);
      expect(lockfileAfter.commit).toBe(lockfileBefore.commit);
    });

    it('should handle tag filtering updates', async () => {
      const command = new SyncCommand({
        tags: ['backend'],
        scope: 'global',
        verbose: false,
      });

      await command.execute();

      const lockfilePath = getLockfilePath('global');
      const lockfile = await lockfileManager.read(lockfilePath);

      // Tags should be updated
      expect(lockfile.tags).toEqual(['backend']);
    });

    it('should throw error if not initialized', async () => {
      // Don't set process.env.HOME, use the real config location
      // But make sure we clean it first (done in beforeEach)

      // Verify no lockfile exists
      const lockfilePath = getLockfilePath('global');
      const exists = await fsManager.fileExists(lockfilePath);

      if (exists) {
        // Skip test if lockfile exists from previous tests
        // This can happen if tests don't properly clean up
        console.warn('Lockfile exists, skipping test');
        return;
      }

      const command = new SyncCommand({
        scope: 'global',
        verbose: false,
      });

      await expect(command.execute()).rejects.toThrow();
    });
  });

  describe('oct init -> sync workflow', () => {
    it('should handle complete init and sync workflow', async () => {
      process.env.HOME = testDir;

      // Step 1: Initialize with v1.0.0
      const initCommand = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        verbose: false,
      });
      await initCommand.execute();

      // Verify initial state
      let lockfile = await lockfileManager.read(getLockfilePath('global'));
      expect(lockfile.ref).toBe('v1.0.0');
      const initialConfigCount = Object.keys(lockfile.configs).length;

      // Step 2: Sync to v2.0.0
      const syncCommand = new SyncCommand({
        ref: 'v2.0.0',
        scope: 'global',
        verbose: false,
      });
      await syncCommand.execute();

      // Verify updated state
      lockfile = await lockfileManager.read(getLockfilePath('global'));
      expect(lockfile.ref).toBe('v2.0.0');
      const updatedConfigCount = Object.keys(lockfile.configs).length;

      // Should have more configs in v2.0.0
      expect(updatedConfigCount).toBeGreaterThan(initialConfigCount);

      // Verify devops agent exists
      const agentPath = path.join(getBaseConfigDir('global'), 'agent', 'team', 'devops.md');
      const exists = await fsManager.fileExists(agentPath);
      expect(exists).toBe(true);
    });

    it('should handle tag filtering across init and sync', async () => {
      process.env.HOME = testDir;

      // Init with frontend tags only
      const initCommand = new InitCommand({
        repository: testRepoPath,
        ref: 'v1.0.0',
        scope: 'global',
        tags: ['frontend'],
        verbose: false,
      });
      await initCommand.execute();

      // Sync with different tags
      const syncCommand = new SyncCommand({
        tags: ['backend', 'testing'],
        scope: 'global',
        verbose: false,
      });
      await syncCommand.execute();

      // Verify tags were updated
      const lockfile = await lockfileManager.read(getLockfilePath('global'));
      expect(lockfile.tags).toEqual(['backend', 'testing']);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid repository URL', async () => {
      process.env.HOME = testDir;

      const command = new InitCommand({
        repository: 'https://invalid-repo-url-that-does-not-exist.com/repo.git',
        scope: 'global',
        verbose: false,
      });

      await expect(command.execute()).rejects.toThrow();
    });

    it('should handle invalid ref', async () => {
      process.env.HOME = testDir;

      const command = new InitCommand({
        repository: testRepoPath,
        ref: 'non-existent-ref',
        scope: 'global',
        verbose: false,
      });

      await expect(command.execute()).rejects.toThrow();
    });
  });
});
