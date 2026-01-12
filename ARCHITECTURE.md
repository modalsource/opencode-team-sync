# OpenCode Team Sync - Technical Architecture

## Document Information

- **Version**: 1.0.0
- **Last Updated**: 2026-01-12
- **Status**: Design
- **Target Audience**: Developers, Technical Leads

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Module Architecture](#module-architecture)
4. [Data Models](#data-models)
5. [Error Handling Strategy](#error-handling-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Security Considerations](#security-considerations)
8. [Performance Considerations](#performance-considerations)

---

## 1. Architecture Overview

### 1.1 System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    User Environment                          │
│                                                              │
│  ┌──────────────┐                                           │
│  │   Terminal   │                                           │
│  │     CLI      │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         OpenCode Team Sync (oct)                     │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │   CLI    │  │   Core   │  │  Utils   │          │  │
│  │  │ Commands │──│  Engine  │──│ Modules  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  │                                                       │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                      │
│         ┌────────────┼────────────┐                        │
│         ▼            ▼            ▼                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │   Git    │ │   File   │ │ OpenCode │                  │
│  │  Repos   │ │  System  │ │  Config  │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

External:
  - GitHub/GitLab (Team Config Repositories)
  - Local Git Repositories
  - File System (~/.config/opencode/, .opencode/)
```

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CLI Layer (Commander.js)               │
│  ┌───────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ init  │ │ sync │ │status│ │ list │ │ ... │        │
│  └───┬───┘ └───┬──┘ └───┬──┘ └───┬──┘ └───┬──┘        │
│      │         │        │        │        │            │
└──────┼─────────┼────────┼────────┼────────┼────────────┘
       │         │        │        │        │
       ▼         ▼        ▼        ▼        ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Sync     │  │   Discovery  │  │  Validation  │  │
│  │  Orchestr.  │  │    Engine    │  │    Engine    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                │                  │           │
│         └────────┬───────┴─────────┬────────┘           │
│                  ▼                 ▼                    │
│         ┌────────────────┐  ┌─────────────┐            │
│         │   Namespace    │  │     Tag     │            │
│         │    Manager     │  │  Resolver   │            │
│         └────────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────┘
       │         │        │        │        │
       ▼         ▼        ▼        ▼        ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Access Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │     Git      │  │  FileSystem  │  │  Lockfile   │  │
│  │   Manager    │  │   Manager    │  │   Manager   │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
       │         │        │        │        │
       ▼         ▼        ▼        ▼        ▼
┌─────────────────────────────────────────────────────────┐
│                   External Systems                      │
│     Git Repos    │   File System   │   OpenCode        │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Architectural Principles

1. **Separation of Concerns**: CLI, Business Logic, Data Access separated
2. **Dependency Injection**: Services injected, not hard-coded
3. **Fail-Fast**: Validation early, fail with clear messages
4. **Idempotency**: Operations can be safely retried
5. **Atomicity**: Changes are all-or-nothing where possible
6. **Observability**: Comprehensive logging and error reporting
7. **Testability**: All layers independently testable
8. **Extensibility**: Plugin points for future features

---

## 2. Technology Stack

### 2.1 Core Technologies

#### Language: TypeScript

**Rationale**:
- Type safety reduces bugs
- Excellent IDE support
- Large ecosystem
- Easy distribution via npm
- Familiar to most developers

**Alternatives Considered**:
- **Go**: Better performance, but smaller ecosystem, harder npm distribution
- **Rust**: Best performance, but steep learning curve, harder npm integration
- **Python**: Slower, distribution complexity

#### Runtime: Node.js (v18+)

**Rationale**:
- Ubiquitous on developer machines
- Excellent package manager (npm)
- Good performance for I/O tasks
- Rich ecosystem

### 2.2 Key Dependencies

#### CLI Framework: Commander.js

```json
"commander": "^11.0.0"
```

**Rationale**:
- Industry standard for Node CLIs
- Excellent documentation
- Auto-generated help
- Subcommand support
- Middleware support

**Alternatives**:
- **Yargs**: More complex API
- **oclif**: Overkill for our needs

---

#### Git Operations: simple-git

```json
"simple-git": "^3.20.0"
```

**Rationale**:
- Promise-based API
- Good error handling
- Active maintenance
- Comprehensive feature set

**Alternatives**:
- **isomorphic-git**: Pure JS but slower
- **nodegit**: Native bindings, installation issues

---

#### Schema Validation: Zod

```json
"zod": "^3.22.0"
```

**Rationale**:
- TypeScript-first
- Excellent type inference
- Composable schemas
- Clear error messages
- Zero dependencies

**Alternatives**:
- **Yup**: Less TypeScript support
- **Joi**: Larger bundle size
- **AJV**: JSON Schema only

---

#### YAML/JSON Parsing: js-yaml

```json
"js-yaml": "^4.1.0"
```

**Rationale**:
- Standard YAML parser
- Handles frontmatter
- Good error messages

---

#### Logging: Winston

```json
"winston": "^3.11.0"
```

**Rationale**:
- Multiple transports
- Log levels
- Structured logging
- Popular and stable

**Alternatives**:
- **Pino**: Faster but less flexible
- **Bunyan**: Less active

---

#### File Operations: fs-extra

```json
"fs-extra": "^11.2.0"
```

**Rationale**:
- Promise-based fs operations
- Utility functions (copy, move, etc)
- Widely used

---

#### Testing: Vitest

```json
"vitest": "^1.0.0"
```

**Rationale**:
- Fast (Vite-powered)
- TypeScript support
- Jest-compatible API
- Good DX

**Alternatives**:
- **Jest**: Slower, configuration complexity
- **Mocha**: Less features

---

#### CLI UI: chalk, ora, inquirer

```json
"chalk": "^5.3.0",
"ora": "^7.0.1",
"inquirer": "^9.2.0"
```

**Rationale**:
- **chalk**: Colors and styling
- **ora**: Spinners for long operations
- **inquirer**: Interactive prompts

---

### 2.3 Dev Dependencies

```json
{
  "typescript": "^5.3.0",
  "tsup": "^8.0.0",
  "@types/node": "^20.0.0",
  "eslint": "^8.55.0",
  "@typescript-eslint/eslint-plugin": "^6.15.0",
  "@typescript-eslint/parser": "^6.15.0",
  "prettier": "^3.1.0",
  "@vitest/coverage-v8": "^1.0.0"
}
```

### 2.4 Build & Distribution

#### Bundler: tsup

**Rationale**:
- Fast (esbuild-based)
- Simple configuration
- TypeScript-first
- Generates .d.ts files

#### Package Distribution: npm

**Rationale**:
- Standard for Node.js tools
- Good versioning
- Easy installation
- Binary support (npx)

---

## 3. Module Architecture

### 3.1 Directory Structure

```
src/
├── cli/
│   ├── commands/           # Command implementations
│   │   ├── init.ts
│   │   ├── sync.ts
│   │   ├── status.ts
│   │   ├── list.ts
│   │   ├── validate.ts
│   │   ├── update.ts
│   │   ├── rollback.ts
│   │   ├── remove.ts
│   │   ├── clean.ts
│   │   └── info.ts
│   ├── middleware/         # CLI middleware
│   │   ├── error-handler.ts
│   │   ├── logger.ts
│   │   └── validation.ts
│   ├── ui/                # UI components
│   │   ├── spinner.ts
│   │   ├── prompts.ts
│   │   ├── formatters.ts
│   │   └── table.ts
│   └── index.ts           # CLI entry point
│
├── core/
│   ├── discovery/
│   │   ├── discovery-engine.ts
│   │   ├── manifest-parser.ts
│   │   └── pattern-matcher.ts
│   ├── git/
│   │   ├── git-manager.ts
│   │   ├── auth-handler.ts
│   │   └── ref-resolver.ts
│   ├── sync/
│   │   ├── sync-engine.ts
│   │   ├── change-detector.ts
│   │   ├── conflict-resolver.ts
│   │   └── sync-orchestrator.ts
│   ├── validator/
│   │   ├── validation-engine.ts
│   │   ├── agent-validator.ts
│   │   ├── skill-validator.ts
│   │   └── manifest-validator.ts
│   ├── namespace/
│   │   ├── namespace-manager.ts
│   │   └── conflict-detector.ts
│   ├── lockfile/
│   │   ├── lockfile-manager.ts
│   │   └── lockfile-schema.ts
│   └── tags/
│       ├── tag-resolver.ts
│       └── tag-matcher.ts
│
├── schemas/               # Zod schemas
│   ├── agent.schema.ts
│   ├── skill.schema.ts
│   ├── manifest.schema.ts
│   └── lockfile.schema.ts
│
├── types/                 # TypeScript types
│   ├── config.types.ts
│   ├── lockfile.types.ts
│   ├── sync.types.ts
│   ├── validation.types.ts
│   └── cli.types.ts
│
├── utils/                 # Utility functions
│   ├── fs-utils.ts
│   ├── path-utils.ts
│   ├── hash-utils.ts
│   ├── error-utils.ts
│   └── logger.ts
│
└── index.ts              # Public API exports

tests/
├── unit/
│   ├── core/
│   ├── cli/
│   └── utils/
├── integration/
│   ├── init.test.ts
│   ├── sync.test.ts
│   └── ...
├── fixtures/
│   ├── repos/
│   ├── configs/
│   └── lockfiles/
└── helpers/
    ├── test-repo.ts
    └── mock-git.ts
```

### 3.2 Core Modules

#### GitManager

```typescript
/**
 * Manages all Git operations for remote repositories
 */
export class GitManager {
  constructor(
    private logger: Logger,
    private authHandler: AuthHandler
  ) {}

  /**
   * Clone a repository to a temporary location
   */
  async clone(url: string, destination: string): Promise<void>

  /**
   * Fetch updates from remote
   */
  async fetch(repoPath: string): Promise<void>

  /**
   * Checkout a specific ref (branch/tag/commit)
   */
  async checkout(repoPath: string, ref: string): Promise<void>

  /**
   * Get current commit SHA
   */
  async getCurrentCommit(repoPath: string): Promise<string>

  /**
   * List all tags in repository
   */
  async listTags(repoPath: string): Promise<string[]>

  /**
   * List all branches
   */
  async listBranches(repoPath: string): Promise<string[]>

  /**
   * Resolve a ref to a commit SHA
   */
  async resolveRef(repoPath: string, ref: string): Promise<string>

  /**
   * Check if repository has uncommitted changes
   */
  async hasUncommittedChanges(repoPath: string): Promise<boolean>
}
```

**Dependencies**: simple-git, Logger, AuthHandler

**Error Handling**:
- `GitCloneError`: Repository clone failed
- `GitCheckoutError`: Checkout failed
- `GitAuthError`: Authentication failed
- `GitNotFoundError`: Repository/ref not found

---

#### DiscoveryEngine

```typescript
/**
 * Discovers configurations in a team repository
 */
export class DiscoveryEngine {
  constructor(
    private fsManager: FileSystemManager,
    private manifestParser: ManifestParser,
    private patternMatcher: PatternMatcher,
    private logger: Logger
  ) {}

  /**
   * Discover all configurations in repository
   */
  async discover(repoPath: string): Promise<ConfigEntry[]>

  /**
   * Discover agents (.md files in agents/)
   */
  private async discoverAgents(path: string): Promise<ConfigEntry[]>

  /**
   * Discover skills (SKILL.md in skills/)
   */
  private async discoverSkills(path: string): Promise<ConfigEntry[]>

  /**
   * Parse and merge with manifest if present
   */
  private async mergeWithManifest(
    discovered: ConfigEntry[],
    manifest: Manifest | null
  ): Promise<ConfigEntry[]>
}
```

**Algorithm**:
1. Check for `.opencode-team.yaml` manifest
2. If manifest exists and has explicit configs, use those
3. Otherwise, auto-discover using pattern matching
4. Merge auto-discovered with manifest metadata (tags, etc)
5. Validate discovered configurations

---

#### SyncEngine

```typescript
/**
 * Orchestrates configuration synchronization
 */
export class SyncEngine {
  constructor(
    private discoveryEngine: DiscoveryEngine,
    private changeDetector: ChangeDetector,
    private validator: ValidationEngine,
    private fsManager: FileSystemManager,
    private namespaceManager: NamespaceManager,
    private tagResolver: TagResolver,
    private logger: Logger
  ) {}

  /**
   * Perform sync operation
   */
  async sync(options: SyncOptions): Promise<SyncResult>

  /**
   * Discover configurations from remote
   */
  private async discoverRemoteConfigs(
    repoPath: string
  ): Promise<ConfigEntry[]>

  /**
   * Filter configs by tags
   */
  private filterByTags(
    configs: ConfigEntry[],
    tags?: string[]
  ): ConfigEntry[]

  /**
   * Validate all configurations
   */
  private async validateConfigs(
    configs: ConfigEntry[]
  ): Promise<ValidationResult[]>

  /**
   * Detect changes between local and remote
   */
  private async detectChanges(
    local: ConfigEntry[],
    remote: ConfigEntry[]
  ): Promise<Changes>

  /**
   * Apply changes to file system
   */
  private async applyChanges(
    changes: Changes,
    options: SyncOptions
  ): Promise<SyncResult>

  /**
   * Handle namespace conflicts
   */
  private async handleConflicts(
    conflicts: Conflict[]
  ): Promise<Resolution[]>

  /**
   * Dry-run mode: preview changes without applying
   */
  async dryRun(options: SyncOptions): Promise<SyncPreview>
}
```

**Sync Algorithm**:
```
1. Read lockfile (get current state)
2. Fetch from Git (if needed)
3. Discover remote configurations
4. Filter by tags (if specified)
5. Validate all configurations
6. Detect changes:
   - Added: in remote, not in local
   - Updated: in both, different hash
   - Removed: in local, not in remote
7. Detect conflicts (team vs personal)
8. Apply changes:
   - Create team/ directories if needed
   - Copy files to team/ namespace
   - Update file hashes
9. Update lockfile
10. Return SyncResult
```

---

#### ValidationEngine

```typescript
/**
 * Validates all configuration types
 */
export class ValidationEngine {
  constructor(
    private agentValidator: AgentValidator,
    private skillValidator: SkillValidator,
    private mcpValidator: MCPValidator,
    private manifestValidator: ManifestValidator,
    private logger: Logger
  ) {}

  /**
   * Validate all configurations
   */
  async validateAll(configs: ConfigEntry[]): Promise<ValidationReport>

  /**
   * Validate single configuration
   */
  async validateSingle(config: ConfigEntry): Promise<ValidationResult>

  /**
   * Validate by type
   */
  async validateByType(
    type: ConfigType,
    content: string
  ): Promise<ValidationResult>
}
```

---

#### NamespaceManager

```typescript
/**
 * Manages team/personal namespace isolation
 */
export class NamespaceManager {
  constructor(
    private fsManager: FileSystemManager,
    private logger: Logger
  ) {}

  /**
   * Resolve path for team configuration
   */
  resolveTeamPath(
    scope: 'global' | 'project',
    type: ConfigType,
    name: string
  ): string

  /**
   * Resolve path for personal configuration
   */
  resolvePersonalPath(
    scope: 'global' | 'project',
    type: ConfigType,
    name: string
  ): string

  /**
   * Detect conflicts between team and personal
   */
  async detectConflicts(
    type: ConfigType,
    scope: 'global' | 'project'
  ): Promise<Conflict[]>

  /**
   * Determine which config has precedence
   */
  resolvePrecedence(
    configName: string,
    type: ConfigType,
    forceTeam: boolean
  ): 'team' | 'personal'

  /**
   * Ensure namespace directories exist
   */
  async ensureNamespaces(
    scope: 'global' | 'project'
  ): Promise<void>
}
```

**Namespace Resolution**:
```
Global Team Agent:
  ~/.config/opencode/agent/team/{name}.md

Global Personal Agent:
  ~/.config/opencode/agent/personal/{name}.md

Project Team Skill:
  .opencode/skill/team/{name}/SKILL.md

Project Personal Skill:
  .opencode/skill/personal/{name}/SKILL.md
```

---

#### LockfileManager

```typescript
/**
 * Manages .opencode-team.lock file
 */
export class LockfileManager {
  constructor(
    private fsManager: FileSystemManager,
    private logger: Logger
  ) {}

  /**
   * Read lockfile from disk
   */
  async read(path: string): Promise<Lockfile>

  /**
   * Write lockfile to disk
   */
  async write(path: string, lockfile: Lockfile): Promise<void>

  /**
   * Update lockfile with partial data
   */
  async update(
    path: string,
    updates: Partial<Lockfile>
  ): Promise<void>

  /**
   * Validate lockfile integrity
   */
  validate(lockfile: Lockfile): ValidationResult

  /**
   * Get lockfile path for scope
   */
  getLockfilePath(scope: 'global' | 'project'): string
}
```

**Lockfile Format**:
```yaml
version: "1"
repository: "https://github.com/company/team-configs"
ref: "v1.2.0"
resolved_commit: "abc123def456"
synced_at: "2026-01-11T10:30:00Z"
scope: "global"
configs:
  - path: "agents/frontend-dev.md"
    type: "agent"
    hash: "sha256:abcd1234..."
    tags: ["frontend", "react"]
    synced_at: "2026-01-11T10:30:00Z"
history:
  - ref: "v1.1.0"
    commit: "xyz789abc123"
    synced_at: "2026-01-01T10:00:00Z"
```

---

#### TagResolver

```typescript
/**
 * Resolves and filters configurations by tags
 */
export class TagResolver {
  constructor(
    private logger: Logger
  ) {}

  /**
   * Filter configs by tags (AND logic)
   */
  filterByTags(
    configs: ConfigEntry[],
    tags: string[]
  ): ConfigEntry[]

  /**
   * Exclude configs with specific tags
   */
  excludeTags(
    configs: ConfigEntry[],
    tags: string[]
  ): ConfigEntry[]

  /**
   * Check if config matches tag criteria
   */
  matchTags(
    configTags: string[],
    filterTags: string[]
  ): boolean
}
```

**Tag Matching Algorithm**:
```typescript
// AND logic: config must have ALL specified tags
function matchTags(configTags: string[], filterTags: string[]): boolean {
  return filterTags.every(tag => configTags.includes(tag))
}
```

---

## 4. Data Models

### 4.1 Core Types

```typescript
/**
 * Configuration entry representing a single config file
 */
export interface ConfigEntry {
  path: string                    // Relative path in repo
  type: ConfigType                // agent | skill
  name: string                    // Derived from filename/directory
  hash: string                    // SHA-256 hash of content
  tags: string[]                  // Associated tags
  content?: string                // Actual file content
  syncedAt?: string              // ISO timestamp
}

export type ConfigType = 'agent' | 'skill'

/**
 * Lockfile structure
 */
export interface Lockfile {
  version: string                 // Lockfile format version
  repository: string              // Git repository URL
  ref: string                     // Current ref (branch/tag/commit)
  resolvedCommit: string         // Resolved commit SHA
  syncedAt: string               // Last sync timestamp
  scope: 'global' | 'project'    // Installation scope
  configs: ConfigEntry[]          // Synced configurations
  history: LockfileHistoryEntry[] // Version history
}

/**
 * Sync operation options
 */
export interface SyncOptions {
  tags?: string[]                 // Filter by tags
  excludeTags?: string[]          // Exclude by tags
  dryRun?: boolean               // Preview mode
  forceTeam?: boolean            // Team configs override personal
  noValidate?: boolean           // Skip validation
  scope?: 'global' | 'project'   // Target scope
}

/**
 * Sync operation result
 */
export interface SyncResult {
  added: ConfigEntry[]           // Newly added configs
  updated: ConfigEntry[]         // Updated configs
  removed: string[]              // Removed config names
  conflicts: Conflict[]          // Namespace conflicts
  errors: SyncError[]            // Errors encountered
  warnings: string[]             // Warnings
  duration: number               // Sync duration in ms
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  file?: string                  // File that was validated
}

/**
 * Manifest file structure
 */
export interface Manifest {
  version: string
  name: string
  description?: string
  discovery?: {
    enabled: boolean
  }
  globalTags?: string[]
  configs?: ManifestConfig[]
  policies?: ManifestPolicies
}
```

### 4.2 Zod Schemas

```typescript
import { z } from 'zod'

/**
 * Agent frontmatter schema
 */
export const AgentFrontmatterSchema = z.object({
  description: z.string().min(1).max(1024),
  mode: z.enum(['primary', 'subagent', 'all']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxSteps: z.number().positive().optional(),
  disable: z.boolean().optional(),
  tools: z.record(z.boolean()).optional(),
  permission: z.record(z.enum(['allow', 'deny', 'ask'])).optional(),
  hidden: z.boolean().optional()
})

/**
 * Skill frontmatter schema
 */
export const SkillFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).min(1).max(64),
  description: z.string().min(1).max(1024),
  license: z.string().optional(),
  compatibility: z.string().optional(),
  metadata: z.record(z.string()).optional()
})
```

---

## 5. Error Handling Strategy

### 5.1 Error Hierarchy

```typescript
/**
 * Base error class
 */
export class OpenCodeTeamError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'OpenCodeTeamError'
  }
}

/**
 * Git-related errors
 */
export class GitError extends OpenCodeTeamError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details)
    this.name = 'GitError'
  }
}

export class GitCloneError extends GitError {
  constructor(url: string, cause?: Error) {
    super(
      `Failed to clone repository: ${url}`,
      'GIT_CLONE_ERROR',
      { url, cause: cause?.message }
    )
  }
}

/**
 * Validation errors
 */
export class ValidationError extends OpenCodeTeamError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details)
    this.name = 'ValidationError'
  }
}

/**
 * Sync errors
 */
export class SyncError extends OpenCodeTeamError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details)
    this.name = 'SyncError'
  }
}
```

### 5.2 Error Handling Patterns

```typescript
/**
 * Try-catch with typed errors
 */
async function syncCommand(options: SyncOptions): Promise<void> {
  try {
    const result = await syncEngine.sync(options)
    console.log(formatSyncResult(result))
  } catch (error) {
    if (error instanceof GitAuthError) {
      console.error('Authentication failed. Check your Git credentials.')
      process.exit(1)
    } else if (error instanceof ValidationError) {
      console.error('Validation failed:')
      console.error(error.message)
      process.exit(1)
    } else if (error instanceof OpenCodeTeamError) {
      console.error(`Error [${error.code}]: ${error.message}`)
      process.exit(1)
    } else {
      console.error('Unexpected error:', error)
      process.exit(1)
    }
  }
}
```

### 5.3 Recovery Mechanisms

```typescript
/**
 * Retry with exponential backoff for network errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}
```

---

## 6. Testing Strategy

### 6.1 Test Pyramid

```
        ┌──────────┐
        │    E2E   │  ~5% (End-to-end, slowest)
        └──────────┘
      ┌──────────────┐
      │ Integration  │  ~25% (Multiple modules)
      └──────────────┘
    ┌──────────────────┐
    │      Unit        │  ~70% (Fast, isolated)
    └──────────────────┘
```

### 6.2 Unit Tests

```typescript
// Example: GitManager unit test
describe('GitManager', () => {
  let gitManager: GitManager
  let mockGit: jest.Mocked<SimpleGit>

  beforeEach(() => {
    mockGit = createMockGit()
    gitManager = new GitManager(mockLogger, mockAuthHandler)
  })

  describe('clone', () => {
    it('should clone repository successfully', async () => {
      mockGit.clone.mockResolvedValue()
      
      await gitManager.clone('https://github.com/user/repo', '/tmp/dest')
      
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo',
        '/tmp/dest'
      )
    })

    it('should throw GitCloneError on failure', async () => {
      mockGit.clone.mockRejectedValue(new Error('Network error'))
      
      await expect(
        gitManager.clone('https://github.com/user/repo', '/tmp/dest')
      ).rejects.toThrow(GitCloneError)
    })
  })
})
```

**Coverage Target**: 80%+ for all core modules

### 6.3 Integration Tests

```typescript
// Example: init -> sync workflow
describe('Init and Sync Integration', () => {
  let testRepo: TestRepository
  let tempDir: string

  beforeEach(async () => {
    testRepo = await createTestRepository({
      agents: ['frontend-dev.md', 'backend-api.md'],
      skills: ['git-release/SKILL.md']
    })
    tempDir = await createTempDir()
  })

  afterEach(async () => {
    await testRepo.cleanup()
    await fs.rm(tempDir, { recursive: true })
  })

  it('should initialize and sync configurations', async () => {
    // Initialize
    await cli.run(['init', testRepo.url, '--global'])
    
    // Verify lockfile created
    const lockfilePath = getLockfilePath('global')
    expect(await fs.pathExists(lockfilePath)).toBe(true)
    
    // Verify configs synced
    const agentPath = path.join(
      getGlobalConfigPath(),
      'agent/team/frontend-dev.md'
    )
    expect(await fs.pathExists(agentPath)).toBe(true)
  })
})
```

---

## 7. Security Considerations

### 7.1 Threat Model

**Threats**:
1. Malicious configuration repository
2. Man-in-the-middle attacks on Git operations
3. Secret exposure in configurations
4. Privilege escalation (team configs modifying system)
5. Path traversal attacks

**Mitigations**:
1. **Trust on first use (TOFU)**: Users explicitly init repositories
2. **HTTPS/SSH only**: Enforce secure Git protocols
3. **Secret detection**: Validate configs for potential secrets
4. **Sandbox team configs**: Read-only in team/ namespace
5. **Path sanitization**: Validate all file paths

### 7.2 Secret Detection

```typescript
/**
 * Detect potential secrets in configuration files
 */
function detectSecrets(content: string): string[] {
  const patterns = [
    /(['"]?)(?:api[_-]?key|apikey|access[_-]?token)\1\s*[:=]\s*['"]([^'"]+)['"]/gi,
    /(['"]?)(?:password|passwd|pwd)\1\s*[:=]\s*['"]([^'"]+)['"]/gi,
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
    /\b[A-Za-z0-9]{20,}\b/ // Long alphanumeric strings
  ]
  
  const findings: string[] = []
  
  for (const pattern of patterns) {
    const matches = content.match(pattern)
    if (matches) {
      findings.push(...matches)
    }
  }
  
  return findings
}
```

### 7.3 Path Sanitization

```typescript
/**
 * Sanitize file paths to prevent traversal attacks
 */
function sanitizePath(userPath: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, userPath)
  
  // Ensure resolved path is within baseDir
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal detected')
  }
  
  return resolved
}
```

---

## 8. Performance Considerations

### 8.1 Performance Targets

- **Sync Speed**: < 5 seconds for 50 configurations
- **Memory Usage**: < 100MB during sync
- **Startup Time**: < 500ms for CLI initialization
- **Large Repos**: < 30 seconds for 500+ configurations

### 8.2 Optimization Strategies

1. **Incremental Sync**: Only sync changed files
2. **Parallel Operations**: Use Promise.all for independent operations
3. **Caching**: Cache Git operations and file hashes
4. **Lazy Loading**: Load configs only when needed
5. **Stream Processing**: Use streams for large files

### 8.3 Performance Monitoring

```typescript
/**
 * Performance monitoring wrapper
 */
async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    logger.debug(`${operation} completed in ${duration}ms`)
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    logger.error(`${operation} failed after ${duration}ms`, { error })
    throw error
  }
}
```

---

## Appendices

### A. Decision Log

1. **TypeScript over Go/Rust**: Better npm ecosystem, easier distribution
2. **Commander.js over oclif**: Simpler, less overhead for our needs
3. **Zod over Joi/Yup**: Better TypeScript support, type inference
4. **Directory separation for namespaces**: Clearer than metadata-based approach
5. **Git-based versioning**: Leverage existing Git infrastructure
6. **Tag-based filtering**: Simple and flexible for user needs

### B. Performance Benchmarks

Target metrics for Phase 1:
- Init: < 10s for typical repository
- Sync (no changes): < 1s
- Sync (50 configs): < 5s
- Validate: < 2s for 50 configs
- List: < 100ms

### C. Future Extensions

1. **Plugin System**: Allow custom validators and sync hooks
2. **Multi-Source Config**: Merge configs from multiple repositories
3. **Web UI**: Dashboard for managing team configurations
4. **Analytics**: Track usage and adoption metrics
5. **Auto-Sync**: Background sync with notifications

---

**Document Status**: Complete  
**Next Review**: After Phase 1 implementation begins
