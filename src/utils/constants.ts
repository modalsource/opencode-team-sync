import path from 'path';
import os from 'os';
import type { ConfigScope, ConfigType, NamespaceType } from '../types/index.js';

/**
 * Lockfile format version
 */
export const LOCKFILE_VERSION = '1.0.0';

/**
 * Lockfile name
 */
export const LOCKFILE_NAME = '.opencode-team.lock';

/**
 * Manifest file name
 */
export const MANIFEST_NAME = '.opencode-team.yaml';

/**
 * Alternative manifest names to check
 */
export const MANIFEST_ALIASES = [
  '.opencode-team.yaml',
  '.opencode-team.yml',
  'manifest.yaml',
  'manifest.yml',
];

/**
 * Configuration types
 */
export const CONFIG_TYPES: ConfigType[] = ['agent', 'skill', 'mcp'];

/**
 * Namespace types
 */
export const NAMESPACE_TYPES: NamespaceType[] = ['team', 'personal'];

/**
 * Default scope for operations
 */
export const DEFAULT_SCOPE: ConfigScope = 'global';

/**
 * Default Git ref (branch)
 */
export const DEFAULT_GIT_REF = 'main';

/**
 * Tag validation pattern
 */
export const TAG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Maximum tag length
 */
export const MAX_TAG_LENGTH = 50;

/**
 * Temporary directory name for Git operations
 */
export const TEMP_DIR_PREFIX = 'oct-';

/**
 * Global configuration directory
 */
export const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'opencode');

/**
 * Project configuration directory
 */
export const PROJECT_CONFIG_DIR = '.opencode';

/**
 * Get configuration directory for a given scope
 */
export function getConfigDir(scope: ConfigScope): string {
  return scope === 'global' ? GLOBAL_CONFIG_DIR : PROJECT_CONFIG_DIR;
}

/**
 * Get path for a specific config type and namespace
 */
export function getConfigPath(
  scope: ConfigScope,
  type: ConfigType,
  namespace: NamespaceType
): string {
  return path.join(getConfigDir(scope), type, namespace);
}

/**
 * Get lockfile path for a given scope
 */
export function getLockfilePath(scope: ConfigScope): string {
  return path.join(getConfigDir(scope), LOCKFILE_NAME);
}

/**
 * Auto-discovery patterns for each config type
 */
export const DISCOVERY_PATTERNS: Record<ConfigType, string[]> = {
  agent: ['agents/**/*.md', '*.agent.md'],
  skill: ['skills/**/SKILL.md', 'skill/**/SKILL.md'],
  mcp: ['mcp/**/*.json', 'mcp/**/*.yaml', 'mcp/**/*.yml'],
};

/**
 * Default exclude patterns for auto-discovery
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/README.md',
];

/**
 * Default configuration for oct
 */
export const DEFAULT_OCT_CONFIG = {
  defaultScope: DEFAULT_SCOPE,
  autoCheckUpdates: false,
  checkInterval: 24, // hours
};

/**
 * Timeout for Git operations (ms)
 */
export const GIT_TIMEOUT = 60000; // 60 seconds

/**
 * Timeout for network operations (ms)
 */
export const NETWORK_TIMEOUT = 30000; // 30 seconds

/**
 * Maximum retries for network operations
 */
export const MAX_NETWORK_RETRIES = 3;

/**
 * Delay between retries (ms)
 */
export const RETRY_DELAY = 1000;

/**
 * Maximum number of configurations to display in summary
 */
export const MAX_SUMMARY_ITEMS = 10;

/**
 * Log levels
 */
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

/**
 * Default log level
 */
export const DEFAULT_LOG_LEVEL = 'info';

/**
 * Color codes for terminal output
 */
export const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};
