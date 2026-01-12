import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LockfileManager } from '../../src/core/lockfile/lockfile-manager.js';
import { FileSystemManager } from '../../src/core/fs/fs-manager.js';
import type { Lockfile, ConfigEntry } from '../../src/types/index.js';
import { FileNotFoundError, ValidationError, FileWriteError } from '../../src/utils/errors.js';
import os from 'os';
import path from 'path';

describe('LockfileManager', () => {
  let lockfileManager: LockfileManager;
  let fsManager: FileSystemManager;
  let tempDir: string;
  let lockfilePath: string;

  beforeEach(async () => {
    fsManager = new FileSystemManager();
    lockfileManager = new LockfileManager(fsManager);

    // Create temp directory for tests
    const uniqueId = Math.random().toString(36).substring(7);
    tempDir = path.join(os.tmpdir(), `oct-lockfile-test-${uniqueId}`);
    await fsManager.ensureDir(tempDir);
    lockfilePath = path.join(tempDir, 'oct.lock.yaml');
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fsManager.removeDir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('create', () => {
    it('should create a new lockfile with required fields', async () => {
      const lockfile = await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      expect(lockfile.version).toBe('1.0.0');
      expect(lockfile.repository).toBe('https://github.com/example/repo.git');
      expect(lockfile.ref).toBe('main');
      expect(lockfile.commit).toBe('a'.repeat(40));
      expect(lockfile.scope).toBe('global');
      expect(lockfile.configs).toEqual({});
      expect(new Date(lockfile.lastSync).getTime()).toBeLessThanOrEqual(Date.now());
      expect(new Date(lockfile.lastSync).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('should create lockfile with optional tags', async () => {
      const lockfile = await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'project',
        ['frontend', 'typescript'],
        ['deprecated']
      );

      expect(lockfile.tags).toEqual(['frontend', 'typescript']);
      expect(lockfile.excludeTags).toEqual(['deprecated']);
    });

    it('should write lockfile to disk', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const exists = await fsManager.fileExists(lockfilePath);
      expect(exists).toBe(true);
    });
  });

  describe('read', () => {
    it('should read and parse a valid lockfile', async () => {
      const original = await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const read = await lockfileManager.read(lockfilePath);

      expect(read).toEqual(original);
    });

    it('should throw FileNotFoundError if lockfile does not exist', async () => {
      try {
        await lockfileManager.read('/nonexistent/path.yaml');
        expect.fail('Should have thrown FileNotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(FileNotFoundError);
      }
    });

    it('should throw ValidationError for invalid lockfile format', async () => {
      // Write invalid YAML
      await fsManager.writeFile(lockfilePath, '{ invalid: yaml content', 'utf-8');

      await expect(lockfileManager.read(lockfilePath)).rejects.toThrow();
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Write incomplete lockfile
      const incomplete = `
version: "1.0.0"
repository: "https://github.com/example/repo.git"
# Missing ref, commit, scope, etc.
`;
      await fsManager.writeFile(lockfilePath, incomplete, 'utf-8');

      await expect(lockfileManager.read(lockfilePath)).rejects.toThrow(ValidationError);
    });

    it('should parse lockfile with configs', async () => {
      const config: ConfigEntry = {
        path: 'agents/test-agent.md',
        type: 'agent',
        name: 'test-agent',
        hash: 'b'.repeat(64),
        tags: ['test'],
      };

      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );
      await lockfileManager.addConfig(lockfilePath, config);

      const lockfile = await lockfileManager.read(lockfilePath);

      expect(lockfile.configs['test-agent']).toEqual(config);
    });
  });

  describe('write', () => {
    it('should write a valid lockfile', async () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {},
      };

      await lockfileManager.write(lockfilePath, lockfile);

      const exists = await fsManager.fileExists(lockfilePath);
      expect(exists).toBe(true);

      const read = await lockfileManager.read(lockfilePath);
      expect(read).toEqual(lockfile);
    });

    it('should throw ValidationError for invalid lockfile', async () => {
      const invalid = {
        version: '1.0.0',
        // Missing required fields
      } as unknown as Lockfile;

      await expect(lockfileManager.write(lockfilePath, invalid)).rejects.toThrow(ValidationError);
    });

    it('should format YAML with proper indentation', async () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {
          'test-agent': {
            path: 'agents/test-agent.md',
            type: 'agent',
            name: 'test-agent',
            hash: 'b'.repeat(64),
            tags: ['test', 'example'],
          },
        },
      };

      await lockfileManager.write(lockfilePath, lockfile);

      const content = await fsManager.readFile(lockfilePath, 'utf-8');

      // Check YAML formatting
      expect(content).toContain('version: 1.0.0');
      expect(content).toContain('repository: https://github.com/example/repo.git');
      expect(content).toContain('configs:');
      expect(content).toContain('  test-agent:');
      expect(content).toContain('    path: agents/test-agent.md');
    });
  });

  describe('update', () => {
    it('should update existing lockfile fields', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const updated = await lockfileManager.update(lockfilePath, {
        ref: 'develop',
        commit: 'b'.repeat(40),
      });

      expect(updated.ref).toBe('develop');
      expect(updated.commit).toBe('b'.repeat(40));
      expect(updated.repository).toBe('https://github.com/example/repo.git');
      expect(updated.scope).toBe('global');
    });

    it('should update lastSync timestamp', async () => {
      const original = await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await lockfileManager.update(lockfilePath, { ref: 'develop' });

      expect(new Date(updated.lastSync).getTime()).toBeGreaterThan(
        new Date(original.lastSync).getTime()
      );
    });

    it('should merge configs when updating', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const config1: ConfigEntry = {
        path: 'agents/agent1.md',
        type: 'agent',
        name: 'agent1',
        hash: 'b'.repeat(64),
        tags: [],
      };

      const config2: ConfigEntry = {
        path: 'agents/agent2.md',
        type: 'agent',
        name: 'agent2',
        hash: 'c'.repeat(64),
        tags: [],
      };

      await lockfileManager.update(lockfilePath, {
        configs: { agent1: config1 },
      });

      const updated = await lockfileManager.update(lockfilePath, {
        configs: { agent2: config2 },
      });

      expect(updated.configs['agent1']).toEqual(config1);
      expect(updated.configs['agent2']).toEqual(config2);
    });

    it('should throw FileNotFoundError if lockfile does not exist', async () => {
      try {
        await lockfileManager.update('/nonexistent/path.yaml', { ref: 'develop' });
        expect.fail('Should have thrown FileNotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(FileNotFoundError);
      }
    });
  });

  describe('validate', () => {
    it('should validate a correct lockfile', () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {},
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid version', () => {
      const lockfile: Lockfile = {
        version: '2.0.0', // Unsupported version
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {},
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Unsupported lockfile version'))).toBe(
        true
      );
    });

    it('should detect invalid repository URL', () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'not-a-valid-url',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {},
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.valid).toBe(false);
      // Schema validation will catch this before custom validation
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about invalid commit SHA format', () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'invalid-sha',
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {},
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.warnings.some((w) => w.message.includes('Commit SHA may be invalid'))).toBe(
        true
      );
    });

    it('should detect config key mismatch', () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {
          'wrong-key': {
            path: 'agents/test.md',
            type: 'agent',
            name: 'test',
            hash: 'b'.repeat(64),
            tags: [],
          },
        },
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('does not match config name'))).toBe(
        true
      );
    });

    it('should warn about empty configs', () => {
      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: new Date().toISOString(),
        configs: {},
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.warnings.some((w) => w.message.includes('no configurations'))).toBe(true);
    });

    it('should warn about future lastSync timestamp', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future

      const lockfile: Lockfile = {
        version: '1.0.0',
        repository: 'https://github.com/example/repo.git',
        ref: 'main',
        commit: 'a'.repeat(40),
        scope: 'global',
        lastSync: futureDate,
        configs: {},
      };

      const result = lockfileManager.validate(lockfile);

      expect(result.warnings.some((w) => w.message.includes('in the future'))).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true if lockfile exists', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const exists = await lockfileManager.exists(lockfilePath);
      expect(exists).toBe(true);
    });

    it('should return false if lockfile does not exist', async () => {
      const exists = await lockfileManager.exists(lockfilePath);
      expect(exists).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove an existing lockfile', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      await lockfileManager.remove(lockfilePath);

      const exists = await fsManager.fileExists(lockfilePath);
      expect(exists).toBe(false);
    });

    it('should not throw if lockfile does not exist', async () => {
      await expect(lockfileManager.remove(lockfilePath)).resolves.not.toThrow();
    });
  });

  describe('addConfig', () => {
    it('should add a new config to lockfile', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const config: ConfigEntry = {
        path: 'agents/test.md',
        type: 'agent',
        name: 'test',
        hash: 'b'.repeat(64),
        tags: ['example'],
      };

      await lockfileManager.addConfig(lockfilePath, config);

      const lockfile = await lockfileManager.read(lockfilePath);
      expect(lockfile.configs['test']).toEqual(config);
    });

    it('should update existing config', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const config1: ConfigEntry = {
        path: 'agents/test.md',
        type: 'agent',
        name: 'test',
        hash: 'b'.repeat(64),
        tags: ['v1'],
      };

      await lockfileManager.addConfig(lockfilePath, config1);

      const config2: ConfigEntry = {
        path: 'agents/test.md',
        type: 'agent',
        name: 'test',
        hash: 'c'.repeat(64),
        tags: ['v2'],
      };

      await lockfileManager.addConfig(lockfilePath, config2);

      const lockfile = await lockfileManager.read(lockfilePath);
      expect(lockfile.configs['test']).toEqual(config2);
    });
  });

  describe('removeConfig', () => {
    it('should remove a config from lockfile', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      const config: ConfigEntry = {
        path: 'agents/test.md',
        type: 'agent',
        name: 'test',
        hash: 'b'.repeat(64),
        tags: [],
      };

      await lockfileManager.addConfig(lockfilePath, config);
      await lockfileManager.removeConfig(lockfilePath, 'test');

      const lockfile = await lockfileManager.read(lockfilePath);
      expect(lockfile.configs['test']).toBeUndefined();
    });

    it('should not throw if config does not exist', async () => {
      await lockfileManager.create(
        lockfilePath,
        'https://github.com/example/repo.git',
        'main',
        'a'.repeat(40),
        'global'
      );

      await expect(
        lockfileManager.removeConfig(lockfilePath, 'nonexistent')
      ).resolves.not.toThrow();
    });
  });
});
