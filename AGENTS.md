# AGENTS.md - OpenCode Team Sync (oct)

This file provides guidance for AI coding agents working on this codebase.

## Project Overview

OpenCode Team Sync (oct) is a CLI tool for synchronizing OpenCode configurations
(agents, skills, MCP servers) across teams via Git repositories. The project is
currently in the planning/specification phase.

**Tech Stack**: TypeScript 5.x, Node.js 18+, Commander.js, Vitest, tsup

## Build & Development Commands

```bash
npm install                                    # Install dependencies
npm run build                                  # Build the project
npm test                                       # Run all tests
npx vitest run path/to/file.test.ts            # Run a single test file
npx vitest run --testNamePattern "pattern"     # Run tests matching a pattern
npx vitest watch                               # Run tests in watch mode
npm run test:coverage                          # Run tests with coverage
npx tsc --noEmit                               # Type checking
npm run lint                                   # Linting
npm run format                                 # Formatting
```

## Project Structure

```
src/
├── cli/commands/        # init, sync, status, list, validate, update, rollback, remove, clean, info
├── core/                # discovery, git, sync, validator, namespace, lockfile, tags
├── schemas/             # Zod schemas for agent, skill, mcp, manifest, lockfile
├── types/               # TypeScript interfaces
└── utils/               # fs-utils, path-utils, hash-utils, error-utils, logger

tests/
├── unit/                # Fast, isolated tests (~70%)
├── integration/         # Multi-module tests (~25%)
├── fixtures/            # Test data
└── helpers/             # Test utilities
```

## Code Style Guidelines

### TypeScript Conventions

- Use strict mode (`"strict": true` in tsconfig.json)
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public functions
- Avoid `any` - use `unknown` with type guards
- Use `readonly` for immutable properties

### Naming Conventions

- **Files**: kebab-case (`git-manager.ts`, `sync-engine.ts`)
- **Classes**: PascalCase (`GitManager`, `SyncEngine`)
- **Interfaces**: PascalCase, no `I` prefix (`ConfigEntry`, not `IConfigEntry`)
- **Functions/Methods**: camelCase (`discoverConfigs`, `validateSchema`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `ERROR_CODES`)

### Imports

Group imports: external deps, internal modules, types. Use ES modules exclusively.

```typescript
import { Command } from 'commander';
import { z } from 'zod';
import { GitManager } from '@/core/git/git-manager';
import type { ConfigEntry } from '@/types';
```

### Error Handling

Use custom error classes extending `OpenCodeTeamError` with error codes:

```typescript
export class GitCloneError extends GitError {
  constructor(url: string, cause?: Error) {
    super(`Failed to clone repository: ${url}`, 'GIT_CLONE_ERROR', { url, cause: cause?.message });
  }
}
```

### Async/Await

- Always use async/await over raw Promises
- Handle errors with try-catch, not .catch()
- Use Promise.all() for parallel independent operations

### Schema Validation (Zod)

Define schemas in `src/schemas/`, export inferred types alongside:

```typescript
export const AgentFrontmatterSchema = z.object({
  description: z.string().min(1).max(1024),
  mode: z.enum(['primary', 'subagent', 'all']).optional(),
  tags: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)).optional(),
});
export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;
```

### Testing

- Test files: `*.test.ts` - use descriptive names, Arrange-Act-Assert pattern
- Mock external deps (Git, file system), target 80%+ coverage

## Architecture Principles

1. **Separation of Concerns**: CLI, Business Logic, Data Access separated
2. **Dependency Injection**: Services injected, not hard-coded
3. **Fail-Fast**: Validate early, fail with clear messages
4. **Idempotency**: Operations can be safely retried
5. **Atomicity**: Changes are all-or-nothing where possible

## Key Interfaces

```typescript
interface ConfigEntry {
  path: string;           // Relative path in repo
  type: ConfigType;       // 'agent' | 'skill' | 'mcp'
  name: string;           // Derived from filename/directory
  hash: string;           // SHA-256 of content
  tags: string[];
}

interface SyncResult {
  added: ConfigEntry[];
  updated: ConfigEntry[];
  removed: string[];
  conflicts: Conflict[];
  errors: SyncError[];
}
```

## Configuration Types

- **Agents**: Markdown files with YAML frontmatter (`.md`)
- **Skills**: SKILL.md files in skill directories
- **MCP Servers**: JSON/YAML configuration files

## Namespace Isolation

Team configs: `{config_dir}/{type}/team/`, Personal: `{config_dir}/{type}/personal/`
Personal always takes precedence over team configs.
