import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  PermissionDeniedError,
  FileSystemError,
  ErrorCode,
} from '../../utils/errors.js';
import { getLogger } from '../../utils/logger.js';

/**
 * File system operations manager
 * Handles all file system operations with proper error handling
 */
export class FileSystemManager {
  private logger = getLogger();

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDir(dirPath: string): Promise<void> {
    this.logger.debug(`Ensuring directory exists: ${dirPath}`);
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error instanceof Error) {
        throw new FileSystemError(
          `Failed to create directory: ${dirPath}`,
          ErrorCode.FS_WRITE_ERROR,
          { path: dirPath },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Copy a file from source to destination
   */
  async copyFile(src: string, dest: string): Promise<void> {
    this.logger.debug(`Copying file: ${src} -> ${dest}`);
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(dest);
      await this.ensureDir(destDir);

      // Copy the file
      await fs.copyFile(src, dest);
      this.logger.debug('File copied successfully');
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new FileNotFoundError(src);
        }
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new PermissionDeniedError(dest, 'copy');
        }
        throw new FileSystemError(
          `Failed to copy file: ${src} -> ${dest}`,
          ErrorCode.FS_COPY_ERROR,
          { src, dest },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Remove a file
   */
  async removeFile(filePath: string): Promise<void> {
    this.logger.debug(`Removing file: ${filePath}`);
    try {
      await fs.unlink(filePath);
      this.logger.debug('File removed successfully');
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File doesn't exist - this is okay
          return;
        }
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new PermissionDeniedError(filePath, 'delete');
        }
        throw new FileSystemError(
          `Failed to remove file: ${filePath}`,
          ErrorCode.FS_DELETE_ERROR,
          { path: filePath },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Remove a directory recursively
   */
  async removeDir(dirPath: string): Promise<void> {
    this.logger.debug(`Removing directory: ${dirPath}`);
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      this.logger.debug('Directory removed successfully');
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new PermissionDeniedError(dirPath, 'delete');
        }
        throw new FileSystemError(
          `Failed to remove directory: ${dirPath}`,
          ErrorCode.FS_DELETE_ERROR,
          { path: dirPath },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Read a file as string
   */
  async readFile(filePath: string): Promise<string> {
    this.logger.debug(`Reading file: ${filePath}`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new FileNotFoundError(filePath);
        }
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new PermissionDeniedError(filePath, 'read');
        }
        throw new FileReadError(filePath, error);
      }
      throw error;
    }
  }

  /**
   * Write content to a file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    this.logger.debug(`Writing file: ${filePath}`);
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      // Write file
      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.debug('File written successfully');
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new PermissionDeniedError(filePath, 'write');
        }
        throw new FileWriteError(filePath, error);
      }
      throw error;
    }
  }

  /**
   * List files in a directory (non-recursive)
   */
  async listFiles(dirPath: string): Promise<string[]> {
    this.logger.debug(`Listing files in: ${dirPath}`);
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
      this.logger.debug(`Found ${files.length} files`);
      return files;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new FileNotFoundError(dirPath);
        }
        throw new FileSystemError(
          `Failed to list files in: ${dirPath}`,
          ErrorCode.FS_READ_ERROR,
          { path: dirPath },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a directory
   */
  async isDirectory(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get SHA-256 hash of a file
   */
  async getFileHash(filePath: string): Promise<string> {
    this.logger.debug(`Computing hash for: ${filePath}`);
    try {
      const content = await this.readFile(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      this.logger.debug(`Hash: ${hash}`);
      return hash;
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new FileSystemError(
          `Failed to compute hash: ${filePath}`,
          ErrorCode.FS_READ_ERROR,
          { path: filePath },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Get file stats
   */
  async getStats(filePath: string): Promise<{ size: number; modified: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new FileNotFoundError(filePath);
        }
        throw new FileSystemError(
          `Failed to get stats: ${filePath}`,
          ErrorCode.FS_READ_ERROR,
          { path: filePath },
          error
        );
      }
      throw error;
    }
  }

  /**
   * Walk directory recursively and return all file paths
   */
  async walkDir(dirPath: string, pattern?: RegExp): Promise<string[]> {
    this.logger.debug(`Walking directory: ${dirPath}`);
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.walkDir(fullPath, pattern);
          results.push(...subResults);
        } else if (entry.isFile()) {
          if (!pattern || pattern.test(fullPath)) {
            results.push(fullPath);
          }
        }
      }

      return results;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return [];
        }
        throw new FileSystemError(
          `Failed to walk directory: ${dirPath}`,
          ErrorCode.FS_READ_ERROR,
          { path: dirPath },
          error
        );
      }
      throw error;
    }
  }
}
