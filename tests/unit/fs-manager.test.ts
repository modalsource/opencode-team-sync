import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemManager } from '../../src/core/fs/fs-manager.js';
import { FileNotFoundError } from '../../src/utils/errors.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileSystemManager', () => {
  const fsManager = new FileSystemManager();
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for tests
    testDir = path.join(os.tmpdir(), `oct-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      const newDir = path.join(testDir, 'new-dir');
      await fsManager.ensureDir(newDir);
      const exists = await fsManager.isDirectory(newDir);
      expect(exists).toBe(true);
    });

    it('should not error if directory already exists', async () => {
      await fsManager.ensureDir(testDir);
      await expect(fsManager.ensureDir(testDir)).resolves.not.toThrow();
    });
  });

  describe('writeFile and readFile', () => {
    it('should write and read file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';

      await fsManager.writeFile(filePath, content);
      const readContent = await fsManager.readFile(filePath);

      expect(readContent).toBe(content);
    });

    it('should throw FileNotFoundError when reading non-existent file', async () => {
      const filePath = path.join(testDir, 'non-existent.txt');
      try {
        await fsManager.readFile(filePath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).name).toBe('FileNotFoundError');
        expect((error as Error).message).toContain('File not found');
      }
    });

    it('should create parent directories when writing', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
      await fsManager.writeFile(filePath, 'content');
      const exists = await fsManager.fileExists(filePath);
      expect(exists).toBe(true);
    });
  });

  describe('copyFile', () => {
    it('should copy file from source to destination', async () => {
      const src = path.join(testDir, 'source.txt');
      const dest = path.join(testDir, 'dest.txt');
      const content = 'Test content';

      await fsManager.writeFile(src, content);
      await fsManager.copyFile(src, dest);

      const destContent = await fsManager.readFile(dest);
      expect(destContent).toBe(content);
    });

    it('should create destination directories', async () => {
      const src = path.join(testDir, 'source.txt');
      const dest = path.join(testDir, 'nested', 'dest.txt');

      await fsManager.writeFile(src, 'content');
      await fsManager.copyFile(src, dest);

      const exists = await fsManager.fileExists(dest);
      expect(exists).toBe(true);
    });
  });

  describe('removeFile', () => {
    it('should remove existing file', async () => {
      const filePath = path.join(testDir, 'to-remove.txt');
      await fsManager.writeFile(filePath, 'content');
      await fsManager.removeFile(filePath);

      const exists = await fsManager.fileExists(filePath);
      expect(exists).toBe(false);
    });

    it('should not error when removing non-existent file', async () => {
      const filePath = path.join(testDir, 'non-existent.txt');
      await expect(fsManager.removeFile(filePath)).resolves.not.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fsManager.writeFile(filePath, 'content');
      expect(await fsManager.fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(testDir, 'does-not-exist.txt');
      expect(await fsManager.fileExists(filePath)).toBe(false);
    });
  });

  describe('getFileHash', () => {
    it('should compute consistent hash for file', async () => {
      const filePath = path.join(testDir, 'hash-test.txt');
      const content = 'Test content for hashing';

      await fsManager.writeFile(filePath, content);
      const hash1 = await fsManager.getFileHash(filePath);
      const hash2 = await fsManager.getFileHash(filePath);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different content', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');

      await fsManager.writeFile(file1, 'content 1');
      await fsManager.writeFile(file2, 'content 2');

      const hash1 = await fsManager.getFileHash(file1);
      const hash2 = await fsManager.getFileHash(file2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('walkDir', () => {
    it('should find all files recursively', async () => {
      // Create test structure
      await fsManager.writeFile(path.join(testDir, 'file1.txt'), 'content');
      await fsManager.writeFile(path.join(testDir, 'dir1', 'file2.txt'), 'content');
      await fsManager.writeFile(path.join(testDir, 'dir1', 'dir2', 'file3.txt'), 'content');

      const files = await fsManager.walkDir(testDir);
      expect(files).toHaveLength(3);
    });

    it('should filter files by pattern', async () => {
      await fsManager.writeFile(path.join(testDir, 'file1.txt'), 'content');
      await fsManager.writeFile(path.join(testDir, 'file2.md'), 'content');
      await fsManager.writeFile(path.join(testDir, 'file3.txt'), 'content');

      const txtFiles = await fsManager.walkDir(testDir, /\.txt$/);
      expect(txtFiles).toHaveLength(2);
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      await fsManager.writeFile(path.join(testDir, 'file1.txt'), 'content');
      await fsManager.writeFile(path.join(testDir, 'file2.txt'), 'content');
      await fsManager.ensureDir(path.join(testDir, 'subdir'));

      const files = await fsManager.listFiles(testDir);
      expect(files).toHaveLength(2);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).not.toContain('subdir');
    });
  });
});
