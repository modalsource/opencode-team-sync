/**
 * Error codes for OpenCode Team Sync
 */
export enum ErrorCode {
  // Git errors (1xxx)
  GIT_CLONE_ERROR = 'GIT_CLONE_ERROR',
  GIT_FETCH_ERROR = 'GIT_FETCH_ERROR',
  GIT_CHECKOUT_ERROR = 'GIT_CHECKOUT_ERROR',
  GIT_INVALID_REF = 'GIT_INVALID_REF',
  GIT_INVALID_URL = 'GIT_INVALID_URL',
  GIT_AUTH_ERROR = 'GIT_AUTH_ERROR',
  GIT_NOT_FOUND = 'GIT_NOT_FOUND',
  GIT_NETWORK_ERROR = 'GIT_NETWORK_ERROR',

  // Validation errors (2xxx)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_SCHEMA_ERROR = 'VALIDATION_SCHEMA_ERROR',
  VALIDATION_FRONTMATTER_ERROR = 'VALIDATION_FRONTMATTER_ERROR',
  VALIDATION_MANIFEST_ERROR = 'VALIDATION_MANIFEST_ERROR',
  VALIDATION_LOCKFILE_ERROR = 'VALIDATION_LOCKFILE_ERROR',

  // Sync errors (3xxx)
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_NOT_INITIALIZED = 'SYNC_NOT_INITIALIZED',
  SYNC_ALREADY_INITIALIZED = 'SYNC_ALREADY_INITIALIZED',
  SYNC_NO_CONFIGS_FOUND = 'SYNC_NO_CONFIGS_FOUND',

  // File system errors (4xxx)
  FS_READ_ERROR = 'FS_READ_ERROR',
  FS_WRITE_ERROR = 'FS_WRITE_ERROR',
  FS_DELETE_ERROR = 'FS_DELETE_ERROR',
  FS_COPY_ERROR = 'FS_COPY_ERROR',
  FS_NOT_FOUND = 'FS_NOT_FOUND',
  FS_PERMISSION_DENIED = 'FS_PERMISSION_DENIED',
  FS_DISK_FULL = 'FS_DISK_FULL',

  // Configuration errors (5xxx)
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',

  // Namespace errors (6xxx)
  NAMESPACE_CONFLICT = 'NAMESPACE_CONFLICT',
  NAMESPACE_INVALID = 'NAMESPACE_INVALID',

  // Tag errors (7xxx)
  TAG_INVALID_FORMAT = 'TAG_INVALID_FORMAT',
  TAG_NOT_FOUND = 'TAG_NOT_FOUND',

  // General errors (9xxx)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
}

/**
 * Base error class for all OpenCode Team errors
 */
export class OpenCodeTeamError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OpenCodeTeamError';
    Object.setPrototypeOf(this, OpenCodeTeamError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Git operation errors
 */
export class GitError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'GitError';
    Object.setPrototypeOf(this, GitError.prototype);
  }
}

export class GitCloneError extends GitError {
  constructor(url: string, cause?: Error) {
    super(
      `Failed to clone repository: ${url}`,
      ErrorCode.GIT_CLONE_ERROR,
      { url, cause: cause?.message },
      cause
    );
    this.name = 'GitCloneError';
  }
}

export class GitFetchError extends GitError {
  constructor(repoPath: string, cause?: Error) {
    super(
      `Failed to fetch repository: ${repoPath}`,
      ErrorCode.GIT_FETCH_ERROR,
      { repoPath, cause: cause?.message },
      cause
    );
    this.name = 'GitFetchError';
  }
}

export class GitCheckoutError extends GitError {
  constructor(ref: string, cause?: Error) {
    super(
      `Failed to checkout ref: ${ref}`,
      ErrorCode.GIT_CHECKOUT_ERROR,
      { ref, cause: cause?.message },
      cause
    );
    this.name = 'GitCheckoutError';
  }
}

export class GitInvalidRefError extends GitError {
  constructor(ref: string) {
    super(`Invalid Git ref: ${ref}`, ErrorCode.GIT_INVALID_REF, { ref });
    this.name = 'GitInvalidRefError';
  }
}

export class GitAuthError extends GitError {
  constructor(url: string, cause?: Error) {
    super(
      `Authentication failed for repository: ${url}`,
      ErrorCode.GIT_AUTH_ERROR,
      { url, cause: cause?.message },
      cause
    );
    this.name = 'GitAuthError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(schemaType: string, errors: unknown[], cause?: Error) {
    super(
      `Schema validation failed for ${schemaType}`,
      ErrorCode.VALIDATION_SCHEMA_ERROR,
      { schemaType, errors, cause: cause?.message },
      cause
    );
    this.name = 'SchemaValidationError';
  }
}

export class FrontmatterValidationError extends ValidationError {
  constructor(filePath: string, errors: string[], cause?: Error) {
    super(
      `Frontmatter validation failed for ${filePath}`,
      ErrorCode.VALIDATION_FRONTMATTER_ERROR,
      { filePath, errors, cause: cause?.message },
      cause
    );
    this.name = 'FrontmatterValidationError';
  }
}

/**
 * Sync operation errors
 */
export class SyncError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'SyncError';
    Object.setPrototypeOf(this, SyncError.prototype);
  }
}

export class SyncNotInitializedError extends SyncError {
  constructor() {
    super(
      'Team configurations not initialized. Run "oct init <repository-url>" first.',
      ErrorCode.SYNC_NOT_INITIALIZED
    );
    this.name = 'SyncNotInitializedError';
  }
}

export class SyncAlreadyInitializedError extends SyncError {
  constructor(repository: string) {
    super(
      `Team configurations already initialized from: ${repository}`,
      ErrorCode.SYNC_ALREADY_INITIALIZED,
      { repository }
    );
    this.name = 'SyncAlreadyInitializedError';
  }
}

export class SyncNoConfigsFoundError extends SyncError {
  constructor(repository: string) {
    super(`No configurations found in repository: ${repository}`, ErrorCode.SYNC_NO_CONFIGS_FOUND, {
      repository,
    });
    this.name = 'SyncNoConfigsFoundError';
  }
}

/**
 * File system errors
 */
export class FileSystemError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'FileSystemError';
    Object.setPrototypeOf(this, FileSystemError.prototype);
  }
}

export class FileNotFoundError extends FileSystemError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, ErrorCode.FS_NOT_FOUND, { filePath });
    this.name = 'FileNotFoundError';
  }
}

export class FileReadError extends FileSystemError {
  constructor(filePath: string, cause?: Error) {
    super(
      `Failed to read file: ${filePath}`,
      ErrorCode.FS_READ_ERROR,
      { filePath, cause: cause?.message },
      cause
    );
    this.name = 'FileReadError';
  }
}

export class FileWriteError extends FileSystemError {
  constructor(filePath: string, cause?: Error) {
    super(
      `Failed to write file: ${filePath}`,
      ErrorCode.FS_WRITE_ERROR,
      { filePath, cause: cause?.message },
      cause
    );
    this.name = 'FileWriteError';
  }
}

export class PermissionDeniedError extends FileSystemError {
  constructor(filePath: string, operation: string) {
    super(`Permission denied: ${operation} on ${filePath}`, ErrorCode.FS_PERMISSION_DENIED, {
      filePath,
      operation,
    });
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

export class ConfigNotFoundError extends ConfigError {
  constructor(configName: string, type: string) {
    super(`Configuration not found: ${configName} (type: ${type})`, ErrorCode.CONFIG_NOT_FOUND, {
      configName,
      type,
    });
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigParseError extends ConfigError {
  constructor(filePath: string, cause?: Error) {
    super(
      `Failed to parse configuration: ${filePath}`,
      ErrorCode.CONFIG_PARSE_ERROR,
      { filePath, cause: cause?.message },
      cause
    );
    this.name = 'ConfigParseError';
  }
}

/**
 * Namespace errors
 */
export class NamespaceError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'NamespaceError';
    Object.setPrototypeOf(this, NamespaceError.prototype);
  }
}

export class NamespaceConflictError extends NamespaceError {
  constructor(configName: string, namespace1: string, namespace2: string) {
    super(
      `Namespace conflict for ${configName}: exists in both ${namespace1} and ${namespace2}`,
      ErrorCode.NAMESPACE_CONFLICT,
      { configName, namespace1, namespace2 }
    );
    this.name = 'NamespaceConflictError';
  }
}

/**
 * Tag errors
 */
export class TagError extends OpenCodeTeamError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
    this.name = 'TagError';
    Object.setPrototypeOf(this, TagError.prototype);
  }
}

export class TagInvalidFormatError extends TagError {
  constructor(tag: string) {
    super(
      `Invalid tag format: "${tag}". Tags must match pattern: ^[a-z0-9][a-z0-9-]*[a-z0-9]$`,
      ErrorCode.TAG_INVALID_FORMAT,
      { tag }
    );
    this.name = 'TagInvalidFormatError';
  }
}
