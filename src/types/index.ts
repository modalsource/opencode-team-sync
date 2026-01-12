/**
 * Configuration entry type
 * Represents an agent, skill, or MCP server configuration
 */
export type ConfigType = 'agent' | 'skill' | 'mcp';

/**
 * Scope of the configuration installation
 */
export type ConfigScope = 'global' | 'project';

/**
 * Namespace type for configuration isolation
 */
export type NamespaceType = 'team' | 'personal';

/**
 * Represents a discovered configuration entry
 */
export interface ConfigEntry {
  /** Relative path in the repository */
  path: string;
  /** Type of configuration */
  type: ConfigType;
  /** Configuration name (derived from filename/directory) */
  name: string;
  /** SHA-256 hash of content */
  hash: string;
  /** Tags associated with this config */
  tags: string[];
  /** Optional description */
  description?: string;
}

/**
 * Lockfile structure tracking sync state
 */
export interface Lockfile {
  /** Version of the lockfile format */
  version: string;
  /** Repository URL */
  repository: string;
  /** Current Git ref (branch/tag/commit) */
  ref: string;
  /** Current commit SHA */
  commit: string;
  /** Scope of installation */
  scope: ConfigScope;
  /** Timestamp of last sync */
  lastSync: string;
  /** Active tag filters */
  tags?: string[];
  /** Active exclude tag filters */
  excludeTags?: string[];
  /** Map of config name to config entry */
  configs: Record<string, ConfigEntry>;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Configurations that were added */
  added: ConfigEntry[];
  /** Configurations that were updated */
  updated: ConfigEntry[];
  /** Names of configurations that were removed */
  removed: string[];
  /** Conflicts detected during sync */
  conflicts: Conflict[];
  /** Errors encountered during sync */
  errors: SyncOperationError[];
}

/**
 * Represents a conflict between team and personal configs
 */
export interface Conflict {
  /** Configuration name */
  name: string;
  /** Type of configuration */
  type: ConfigType;
  /** Team configuration entry */
  team: ConfigEntry;
  /** Personal configuration entry (if exists) */
  personal?: ConfigEntry;
  /** Resolution strategy */
  resolution: 'team' | 'personal' | 'manual';
}

/**
 * Sync operation error information
 */
export interface SyncOperationError {
  /** Configuration that caused the error */
  config?: ConfigEntry;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Validation result for a configuration
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Configuration that was validated */
  config: ConfigEntry;
  /** Validation errors */
  errors: ValidationIssue[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationIssue {
  /** Error message */
  message: string;
  /** Path to the field with error (for structured data) */
  path?: string;
  /** Line number in file (if applicable) */
  line?: number;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Path to the field with warning */
  path?: string;
  /** Line number in file (if applicable) */
  line?: number;
}

/**
 * Team configuration manifest
 */
export interface Manifest {
  /** Version of manifest format */
  version: string;
  /** Repository metadata */
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    homepage?: string;
  };
  /** Global tags applied to all configs */
  globalTags?: string[];
  /** Explicit list of configurations (overrides auto-discovery) */
  configs?: ManifestConfig[];
  /** Patterns to exclude from auto-discovery */
  exclude?: string[];
}

/**
 * Configuration entry in manifest
 */
export interface ManifestConfig {
  /** Configuration type */
  type: ConfigType;
  /** Path to configuration in repository */
  path: string;
  /** Override name */
  name?: string;
  /** Override tags */
  tags?: string[];
  /** Override description */
  description?: string;
}

/**
 * Status information
 */
export interface StatusInfo {
  /** Whether team configs are initialized */
  initialized: boolean;
  /** Repository URL (if initialized) */
  repository?: string;
  /** Current ref */
  ref?: string;
  /** Current commit */
  commit?: string;
  /** Scope of installation */
  scope?: ConfigScope;
  /** Last sync timestamp */
  lastSync?: string;
  /** Number of synced configurations */
  configCount: number;
  /** Whether updates are available */
  updatesAvailable: boolean;
  /** Latest available commit (if updates available) */
  latestCommit?: string;
}

/**
 * Update information
 */
export interface UpdateInfo {
  /** Whether updates are available */
  available: boolean;
  /** Current commit */
  currentCommit: string;
  /** Latest commit */
  latestCommit: string;
  /** Commits between current and latest */
  commits: GitCommit[];
  /** Configurations that would be affected */
  affectedConfigs: ConfigEntry[];
}

/**
 * Git commit information
 */
export interface GitCommit {
  /** Commit SHA */
  sha: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Commit date */
  date: string;
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Tags to include (OR logic within, AND between multiple arrays) */
  tags?: string[];
  /** Tags to exclude */
  excludeTags?: string[];
  /** Dry run (preview only) */
  dryRun?: boolean;
  /** Force team configs to override personal */
  forceTeam?: boolean;
  /** Skip validation */
  noValidate?: boolean;
  /** Specific Git ref to sync */
  ref?: string;
}

/**
 * Init options
 */
export interface InitOptions {
  /** Repository URL */
  repository: string;
  /** Git ref (branch/tag/commit) */
  ref?: string;
  /** Install globally or in project */
  scope?: ConfigScope;
  /** Initial tag filter */
  tags?: string[];
  /** Initial exclude tag filter */
  excludeTags?: string[];
}

/**
 * List options
 */
export interface ListOptions {
  /** Filter by config type */
  type?: ConfigType;
  /** Filter by tags */
  tags?: string[];
  /** Filter by namespace */
  namespace?: NamespaceType;
  /** Output format */
  format?: 'table' | 'tree' | 'json';
  /** Verbose output */
  verbose?: boolean;
}

/**
 * oct configuration (stored in lockfile or separate config file)
 */
export interface OctConfig {
  /** Default scope for operations */
  defaultScope?: ConfigScope;
  /** Auto-check for updates */
  autoCheckUpdates?: boolean;
  /** Check interval in hours */
  checkInterval?: number;
}
