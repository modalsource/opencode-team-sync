import path from 'path';
import os from 'os';
import type { ConfigScope, ConfigType, NamespaceType } from '../types/index.js';
import {
  GLOBAL_CONFIG_DIR,
  PROJECT_CONFIG_DIR,
  LOCKFILE_NAME,
  TEMP_DIR_PREFIX,
} from './constants.js';

/**
 * Get the base configuration directory for a scope
 */
export function getBaseConfigDir(scope: ConfigScope): string {
  return scope === 'global' ? GLOBAL_CONFIG_DIR : PROJECT_CONFIG_DIR;
}

/**
 * Get the path for a specific configuration type and namespace
 */
export function getNamespacePath(
  scope: ConfigScope,
  type: ConfigType,
  namespace: NamespaceType
): string {
  return normalizePath(path.join(getBaseConfigDir(scope), type, namespace));
}

/**
 * Get the lockfile path for a scope
 */
export function getLockfilePath(scope: ConfigScope): string {
  return normalizePath(path.join(getBaseConfigDir(scope), LOCKFILE_NAME));
}

/**
 * Get a temporary directory path for Git operations
 */
export function getTempDir(): string {
  return path.join(
    os.tmpdir(),
    `${TEMP_DIR_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/**
 * Normalize a path for cross-platform compatibility
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Get the relative path from base to target
 */
export function getRelativePath(from: string, to: string): string {
  return normalizePath(path.relative(from, to));
}

/**
 * Check if a path is absolute
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Join path segments and normalize
 */
export function joinPath(...segments: string[]): string {
  return normalizePath(path.join(...segments));
}

/**
 * Resolve a configuration name from a file path
 * Examples:
 * - "agents/frontend-dev.md" -> "frontend-dev"
 * - "skills/testing/jest-runner.md" -> "testing-jest-runner"
 * - "mcp/database.json" -> "database"
 */
export function resolveConfigName(filePath: string, type: ConfigType): string {
  const normalized = normalizePath(filePath);
  const parts = normalized.split('/');

  // Remove file extension
  const fileName = parts[parts.length - 1];
  const baseName = path.basename(fileName, path.extname(fileName));

  if (type === 'skill') {
    // For skills, include parent directory in name
    // "skills/testing/jest-runner.md" -> "testing/jest-runner"
    if (parts.length > 2) {
      const parentDir = parts[parts.length - 2];
      return `${parentDir}/${baseName}`;
    }
  }

  return baseName;
}

/**
 * Get the destination path for a configuration file
 */
export function getDestinationPath(
  scope: ConfigScope,
  type: ConfigType,
  namespace: NamespaceType,
  configName: string
): string {
  const namespacePath = getNamespacePath(scope, type, namespace);

  if (type === 'skill' && configName.includes('/')) {
    // Skills maintain directory structure
    return normalizePath(path.join(namespacePath, configName, 'SKILL.md'));
  } else if (type === 'agent') {
    return normalizePath(path.join(namespacePath, `${configName}.md`));
  } else {
    // MCP configs keep their extension
    return normalizePath(path.join(namespacePath, configName));
  }
}

/**
 * Sanitize a configuration name for file system use
 */
export function sanitizeConfigName(name: string): string {
  return name
    .replace(/[^a-z0-9-_/]/gi, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check if a path is within a directory
 */
export function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Expand home directory in path
 */
export function expandHome(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}
