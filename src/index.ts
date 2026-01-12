/**
 * OpenCode Team Sync - Public API
 */

// Export types
export * from './types/index.js';

// Export errors
export * from './utils/errors.js';

// Export constants
export * from './utils/constants.js';

// Export logger
export * from './utils/logger.js';

// Export core modules
export { GitManager } from './core/git/git-manager.js';
export { FileSystemManager } from './core/fs/fs-manager.js';
export { LockfileManager } from './core/lockfile/lockfile-manager.js';
export { DiscoveryEngine } from './core/discovery/discovery-engine.js';
export type {
  DiscoveryOptions,
  DiscoveryResult,
  DiscoveryErrorInfo,
} from './core/discovery/discovery-engine.js';
export * from './core/validator/validators.js';

// Export utils
export * from './utils/path-utils.js';
export * from './utils/yaml-utils.js';

// Version
export const VERSION = '1.0.0-beta.1';
