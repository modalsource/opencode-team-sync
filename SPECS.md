# OpenCode Team Sync (oct) - Technical Specifications

Version: 1.0.0
Last Updated: 2026-01-12
Status: Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [System Architecture](#3-system-architecture)
4. [Tag System](#4-tag-system)
5. [Namespace Isolation](#5-namespace-isolation)
6. [Versioning and Git Integration](#6-versioning-and-git-integration)
7. [Schema Validation](#7-schema-validation)
8. [CLI Commands](#8-cli-commands)
9. [Auto-Discovery](#9-auto-discovery)
10. [Auto-Check Updates](#10-auto-check-updates)
11. [Error Handling](#11-error-handling)
12. [Testing and Validation](#12-testing-and-validation)
13. [Security](#13-security)
14. [Performance](#14-performance)
15. [Use Cases](#15-use-cases)
16. [Technical Implementation](#16-technical-implementation)
17. [Documentation Requirements](#17-documentation-requirements)
18. [Roadmap](#18-roadmap)
19. [Success Metrics](#19-success-metrics)
20. [Risks and Mitigations](#20-risks-and-mitigations)
21. [Appendices](#21-appendices)

---

## 1. Executive Summary

### 1.1 Problem Statement

Development teams using OpenCode face significant challenges in maintaining consistent configurations across team members:

- **Configuration Drift**: Team members develop different agent configurations, leading to inconsistent behavior
- **Onboarding Friction**: New developers spend hours setting up OpenCode configurations manually
- **Knowledge Silos**: Best practices and optimized configs remain with individual developers
- **Version Chaos**: No systematic way to track, update, or rollback configuration changes
- **Security Gaps**: Sensitive configurations may be shared through insecure channels

### 1.2 Solution

OpenCode Team Sync (oct) is a CLI tool that enables teams to:

- Share configurations through Git repositories
- Maintain isolated namespaces (team vs personal)
- Filter configurations using a flexible tag system
- Version and rollback configurations using Git semantics
- Validate configurations before applying them
- Auto-discover and auto-update configurations

### 1.3 Value Proposition

| Stakeholder | Value |
|-------------|-------|
| Developers | Instant access to team-optimized configurations |
| Team Leads | Ensure consistent tooling across the team |
| DevOps | Standardize configurations across environments |
| Organizations | Reduce onboarding time and improve productivity |

### 1.4 Success Metrics

- Onboarding time reduced from hours to minutes
- 100% configuration consistency across team members
- Zero manual configuration sharing via chat/email
- Sub-second sync operations for typical repositories

---

## 2. Project Overview

### 2.1 Objectives

#### Primary Objectives

1. **Synchronization**: Enable seamless sync of OpenCode configurations from Git repositories
2. **Isolation**: Maintain clear separation between team and personal configurations
3. **Flexibility**: Support multiple repository modes and filtering options
4. **Safety**: Validate all configurations before applying them
5. **Versioning**: Leverage Git for version control and rollback capabilities

#### Secondary Objectives

1. **Discovery**: Auto-discover configurations without requiring manifests
2. **Updates**: Notify users of available updates with manual apply
3. **Documentation**: Provide clear documentation and examples
4. **Extensibility**: Design for future enhancements (Phase 2, Phase 3)

### 2.2 Target Users

#### Primary Users

| User Type | Description | Key Needs |
|-----------|-------------|-----------|
| Team Lead | Manages team configurations | Publishing, versioning, access control |
| Developer | Uses team configurations | Easy sync, personal overrides, updates |
| DevOps Engineer | Maintains infrastructure configs | Automation, consistency, validation |

#### Secondary Users

| User Type | Description | Key Needs |
|-----------|-------------|-----------|
| Organization Admin | Manages org-wide configs | Multi-team support, governance |
| Open Source Maintainer | Shares public configs | Discovery, documentation |

### 2.3 Requirements

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Initialize team configuration from Git repository | Must Have |
| FR-02 | Sync configurations with tag-based filtering | Must Have |
| FR-03 | Display sync status and available updates | Must Have |
| FR-04 | List all synced configurations | Must Have |
| FR-05 | Validate configurations before sync | Must Have |
| FR-06 | Update to latest version | Must Have |
| FR-07 | Rollback to previous version | Must Have |
| FR-08 | Remove individual configurations | Should Have |
| FR-09 | Clean all team configurations | Should Have |
| FR-10 | Display system information | Should Have |
| FR-11 | Auto-discover configurations | Should Have |
| FR-12 | Auto-check for updates | Nice to Have |

#### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Sync operation completes in under 5 seconds | Performance |
| NFR-02 | Support repositories up to 1000 configurations | Scalability |
| NFR-03 | Work offline after initial sync | Availability |
| NFR-04 | Clear error messages with recovery suggestions | Usability |
| NFR-05 | No secrets stored in plain text | Security |
| NFR-06 | 90% test coverage | Quality |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   Team Git Repo  |<--->|   oct CLI Tool    |<--->|  Local Configs   |
|                  |     |                   |     |                  |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +-------------------+     +------------------+
|   agents/        |     |   GitManager      |     | ~/.config/       |
|   skills/        |     |   SyncEngine      |     |   opencode/      |
|   manifest.yaml  |     |   Validator       |     |     agent/       |
+------------------+     +-------------------+     |     skill/       |
                                                  +------------------+
```

### 3.2 Component Overview

| Component | Responsibility |
|-----------|----------------|
| CLI Layer | Parse commands, display output, handle user interaction |
| GitManager | Clone, fetch, checkout, manage Git operations |
| DiscoveryEngine | Find configurations in repository |
| SyncEngine | Copy and manage configuration files |
| ValidationEngine | Validate configurations against schemas |
| NamespaceManager | Handle team/personal directory structure |
| LockfileManager | Track sync state and versions |
| TagResolver | Filter configurations by tags |
| ConfigManager | Read/write oct configuration |

### 3.3 Team Repository Structure

```
team-configs/
├── manifest.yaml          # Optional: explicit configuration list
├── agents/
│   ├── frontend-dev.md
│   ├── backend-dev.md
│   └── code-reviewer.md
├── skills/
│   ├── testing/
│   │   ├── jest-runner.md
│   │   └── playwright.md
│   └── deployment/
│       └── k8s-deploy.md
└── README.md
```

### 3.4 Local Directory Structure

```
~/.config/opencode/
├── agent/
│   ├── team/                    # Read-only, synced from team repo
│   │   ├── frontend-dev.md
│   │   └── backend-dev.md
│   └── personal/                # User's personal configs
│       └── my-custom-agent.md
├── skill/
│   ├── team/
│   │   └── testing/
│   │       └── jest-runner.md
│   └── personal/
└── .opencode-team.lock          # Lockfile tracking sync state
```

### 3.5 Project-Level Structure

```
my-project/
├── .opencode/
│   ├── agent/
│   │   ├── team/
│   │   └── personal/
│   ├── skill/
│   │   ├── team/
│   │   └── personal/
│   └── .opencode-team.lock
└── ... (project files)
```

---

## 4. Tag System

### 4.1 Tag Structure

Tags are simple categorical labels attached to configurations for filtering purposes.

#### Tag Format

- Lowercase alphanumeric characters and hyphens
- Maximum length: 50 characters
- Pattern: `^[a-z0-9][a-z0-9-]*[a-z0-9]$`

#### Examples

```
frontend
backend
react
nodejs
testing
production
team-alpha
project-x
```

### 4.2 Tag Assignment

Tags are assigned in the configuration file's frontmatter:

```yaml
---
name: frontend-dev
description: Frontend development agent
tags:
  - frontend
  - react
  - typescript
---

# Frontend Developer Agent

You are a frontend development specialist...
```

### 4.3 Tag Filtering

#### Include Tags (--tags)

Sync only configurations matching specified tags:

```bash
# Sync only frontend configs
oct sync --tags frontend

# Sync frontend OR backend configs
oct sync --tags frontend,backend

# Sync configs matching ALL tags (AND logic)
oct sync --tags frontend --tags react
```

#### Exclude Tags (--exclude-tags)

Exclude configurations matching specified tags:

```bash
# Sync all except experimental
oct sync --exclude-tags experimental

# Sync all except multiple tags
oct sync --exclude-tags experimental,deprecated
```

#### Combined Filtering

```bash
# Sync frontend configs except experimental ones
oct sync --tags frontend --exclude-tags experimental
```

### 4.4 Tag Resolution Algorithm

```
function resolveConfigs(configs, includeTags, excludeTags):
    result = []
    
    for config in configs:
        # If include tags specified, config must match at least one
        if includeTags.length > 0:
            if not config.tags.some(t => includeTags.includes(t)):
                continue
        
        # If exclude tags specified, config must not match any
        if excludeTags.length > 0:
            if config.tags.some(t => excludeTags.includes(t)):
                continue
        
        result.push(config)
    
    return result
```

---

## 5. Namespace Isolation

### 5.1 Isolation Strategy

Namespace isolation ensures team configurations never overwrite personal configurations and vice versa.

#### Directory-Based Separation

```
~/.config/opencode/agent/
├── team/           # Managed by oct (read-only to user)
│   └── *.md
└── personal/       # Managed by user (never touched by oct)
    └── *.md
```

### 5.2 Precedence Rules

When OpenCode loads configurations, the following precedence applies:

1. **Project Personal** (highest): `.opencode/agent/personal/`
2. **Project Team**: `.opencode/agent/team/`
3. **Global Personal**: `~/.config/opencode/agent/personal/`
4. **Global Team** (lowest): `~/.config/opencode/agent/team/`

### 5.3 Naming Conventions

#### Team Configurations

- Source: Repository structure preserved
- Destination: `team/` directory
- Example: `agents/frontend-dev.md` -> `agent/team/frontend-dev.md`

#### Personal Overrides

Users can create personal versions with the same name:

```
~/.config/opencode/agent/
├── team/
│   └── frontend-dev.md      # Team version
└── personal/
    └── frontend-dev.md      # Personal override (takes precedence)
```

### 5.4 Namespace Operations

| Operation | Team Namespace | Personal Namespace |
|-----------|----------------|-------------------|
| oct sync | Modified | Never touched |
| oct clean | Cleared | Never touched |
| oct remove | Single file removed | Never touched |
| User edit | Not allowed | Allowed |

---

## 6. Versioning and Git Integration

### 6.1 Git-Based Versioning

oct leverages Git's native versioning capabilities:

| Version Type | Git Concept | Example |
|--------------|-------------|---------|
| Release | Tag | v1.2.0 |
| Branch | Branch | main, develop |
| Commit | SHA | abc123def456 |

### 6.2 Version Specification

```bash
# Sync latest from default branch
oct sync

# Sync specific tag
oct sync --ref v1.2.0

# Sync specific branch
oct sync --ref develop

# Sync specific commit
oct sync --ref abc123def456
```

### 6.3 Lockfile Format

The lockfile (`.opencode-team.lock`) tracks the current sync state:

```yaml
version: "1"
repository: "https://github.com/company/team-configs"
ref: "v1.2.0"
resolved_commit: "abc123def456789"
synced_at: "2026-01-12T10:30:00Z"
scope: "global"
configs:
  - path: "agents/frontend-dev.md"
    type: "agent"
    destination: "agent/team/frontend-dev.md"
    hash: "sha256:abcd1234567890..."
    tags:
      - frontend
      - react
  - path: "agents/backend-dev.md"
    type: "agent"
    destination: "agent/team/backend-dev.md"
    hash: "sha256:efgh5678901234..."
    tags:
      - backend
      - nodejs
  - path: "skills/testing/jest-runner.md"
    type: "skill"
    destination: "skill/team/testing/jest-runner.md"
    hash: "sha256:ijkl9012345678..."
    tags:
      - testing
      - jest
```

### 6.4 Update Flow

```
1. User runs: oct update
2. oct fetches latest from remote
3. oct compares remote HEAD with lockfile resolved_commit
4. If different:
   a. Display changelog (commits between versions)
   b. Show affected configurations
   c. Prompt for confirmation
   d. Run validation on new configs
   e. Apply update
   f. Update lockfile
5. If same: Display "Already up to date"
```

### 6.5 Rollback Flow

```
1. User runs: oct rollback [ref]
2. If ref not specified:
   a. Show recent versions (tags + last 10 commits)
   b. Prompt user to select
3. Checkout specified ref
4. Run validation
5. Apply sync
6. Update lockfile with new ref
```

---

## 7. Schema Validation

### 7.1 Validation Levels

| Level | When Applied | Failure Behavior |
|-------|--------------|------------------|
| Syntax | Always | Block sync, show error |
| Schema | Always | Block sync, show error |
| Semantic | Optional | Warning, allow sync |

### 7.2 Validation Implementation

Validation uses Zod schemas for type-safe validation:

```typescript
import { z } from 'zod';

const AgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  tags: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().optional(),
});

const SkillConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
});
```

### 7.3 Validation Rules

#### Agent Configurations

| Rule | Description |
|------|-------------|
| Valid YAML frontmatter | Must parse without errors |
| Required name field | Name must be present and non-empty |
| Valid tag format | Tags must match pattern |
| Markdown body | Content after frontmatter must be valid markdown |

#### Skill Configurations

| Rule | Description |
|------|-------------|
| Valid YAML frontmatter | Must parse without errors |
| Required name field | Name must be present and non-empty |
| Valid commands | Command names must be valid identifiers |

**Note**: MCP servers are configured in `opencode.json`, not distributed as separate files. Teams should document their MCP server configurations in the repository README, but these are not synced by oct.

### 7.4 Validation Output

```
$ oct validate

Validating configurations...

✓ agents/frontend-dev.md
✓ agents/backend-dev.md
✗ agents/broken-agent.md
  Error: Invalid frontmatter at line 3
  Expected string for 'name', got number

Validation complete: 2 passed, 1 failed
```

---

## 8. CLI Commands

### 8.1 Command: oct init

Initialize team configuration sync from a Git repository.

#### Syntax

```
oct init <repository-url> [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--ref <ref>` | Git reference (tag/branch/commit) | HEAD of default branch |
| `--scope <scope>` | Config scope (global/project) | global |
| `--tags <tags>` | Comma-separated tags to include | (all) |
| `--exclude-tags <tags>` | Comma-separated tags to exclude | (none) |
| `--dry-run` | Show what would be synced without applying | false |
| `--force` | Overwrite existing team configs | false |

#### Behavior

1. Validate repository URL format
2. Check if already initialized (error if yes, unless --force)
3. Clone/fetch repository to cache
4. Checkout specified ref
5. Discover configurations
6. Apply tag filters
7. Validate all configurations
8. Copy to local directories
9. Create lockfile

#### Success Criteria

- Repository cloned successfully
- At least one valid configuration found
- All configurations pass validation
- Lockfile created
- Configurations copied to correct locations

#### Error Scenarios

| Error | Message | Recovery |
|-------|---------|----------|
| Invalid URL | "Invalid repository URL: {url}" | Check URL format |
| Clone failed | "Failed to clone repository: {error}" | Check network/auth |
| Already initialized | "Team sync already initialized. Use --force to reinitialize" | Use --force or oct clean first |
| No configs found | "No configurations found in repository" | Check repository structure |
| Validation failed | "Validation failed for {n} configurations" | Fix configs or use --skip-validation |

#### Examples

```bash
# Basic initialization
oct init https://github.com/company/team-configs

# Initialize specific version
oct init https://github.com/company/team-configs --ref v1.2.0

# Initialize for current project only
oct init https://github.com/company/team-configs --scope project

# Initialize with tag filter
oct init https://github.com/company/team-configs --tags frontend,react

# Preview without applying
oct init https://github.com/company/team-configs --dry-run

# Reinitialize with different repo
oct init https://github.com/company/new-configs --force
```

---

### 8.2 Command: oct sync

Synchronize configurations from the team repository.

#### Syntax

```
oct sync [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--ref <ref>` | Git reference to sync | Current ref from lockfile |
| `--tags <tags>` | Comma-separated tags to include | (from init or all) |
| `--exclude-tags <tags>` | Comma-separated tags to exclude | (none) |
| `--dry-run` | Show what would be synced without applying | false |
| `--force` | Force sync even if up to date | false |

#### Behavior

1. Read lockfile to get current state
2. Fetch latest from remote
3. Checkout specified ref (or current if not specified)
4. Discover configurations
5. Apply tag filters
6. Compare with current state
7. Validate changed configurations
8. Apply changes (add/update/remove)
9. Update lockfile

#### Success Criteria

- Fetch successful
- Validation passed
- Files synced correctly
- Lockfile updated

#### Error Scenarios

| Error | Message | Recovery |
|-------|---------|----------|
| Not initialized | "Team sync not initialized. Run 'oct init' first" | Run oct init |
| Fetch failed | "Failed to fetch from remote: {error}" | Check network/auth |
| Validation failed | "Validation failed for {n} configurations" | Fix configs upstream |
| Conflict detected | "Local modifications detected in team configs" | Use --force or resolve manually |

#### Examples

```bash
# Sync with current settings
oct sync

# Sync specific version
oct sync --ref v1.3.0

# Sync with different tags
oct sync --tags backend

# Preview changes
oct sync --dry-run

# Force re-sync
oct sync --force
```

---

### 8.3 Command: oct status

Display the current sync status and available updates.

#### Syntax

```
oct status [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--json` | Output in JSON format | false |
| `--verbose` | Show detailed information | false |

#### Behavior

1. Read lockfile
2. Fetch remote (if online)
3. Compare local state with lockfile
4. Check for available updates
5. Display status summary

#### Output Format

```
OpenCode Team Sync Status
========================

Repository: https://github.com/company/team-configs
Current Version: v1.2.0 (abc123d)
Synced At: 2026-01-12 10:30:00

Configurations:
  Agents: 5 synced
  Skills: 3 synced

Status: Up to date

Updates Available:
  v1.3.0 - 2 days ago (3 new configs, 5 updated)
```

#### Examples

```bash
# Basic status
oct status

# JSON output for scripting
oct status --json

# Verbose output
oct status --verbose
```

---

### 8.4 Command: oct list

List all synced configurations.

#### Syntax

```
oct list [type] [options]
```

#### Arguments

| Argument | Description | Values |
|----------|-------------|--------|
| `type` | Filter by configuration type | agent, skill, (all) |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--tags <tags>` | Filter by tags | (all) |
| `--json` | Output in JSON format | false |
| `--verbose` | Show detailed information | false |

#### Output Format

```
Team Configurations
==================

Agents (5):
  ✓ frontend-dev      [frontend, react]
  ✓ backend-dev       [backend, nodejs]
  ✓ code-reviewer     [review, quality]
  ✓ devops-engineer   [devops, k8s]
  ✓ technical-writer  [docs]

Skills (3):
  ✓ testing/jest-runner    [testing, jest]
  ✓ testing/playwright     [testing, e2e]
  ✓ deployment/k8s-deploy  [devops, k8s]
```

#### Examples

```bash
# List all configurations
oct list

# List only agents
oct list agent

# List with tag filter
oct list --tags frontend

# JSON output
oct list --json
```

---

### 8.5 Command: oct validate

Validate configurations before sync.

#### Syntax

```
oct validate [path] [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `path` | Path to validate (file or directory) |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--strict` | Treat warnings as errors | false |
| `--json` | Output in JSON format | false |

#### Behavior

1. If path specified, validate that path
2. If no path, validate all synced configs
3. Run syntax validation
4. Run schema validation
5. Run semantic validation
6. Report results

#### Output Format

```
Validating configurations...

agents/frontend-dev.md
  ✓ Syntax valid
  ✓ Schema valid
  ✓ Semantic valid

agents/broken-agent.md
  ✓ Syntax valid
  ✗ Schema invalid
    - 'name' field is required
    - 'tags[0]' contains invalid characters

Summary: 1 passed, 1 failed
```

#### Examples

```bash
# Validate all synced configs
oct validate

# Validate specific file
oct validate agents/new-agent.md

# Validate directory
oct validate agents/

# Strict mode
oct validate --strict

# JSON output
oct validate --json
```

---

### 8.6 Command: oct update

Update to the latest version or a specific version.

#### Syntax

```
oct update [ref] [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `ref` | Target version (tag/branch/commit) |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Show what would be updated | false |
| `--force` | Skip confirmation prompt | false |

#### Behavior

1. Fetch latest from remote
2. If ref specified, use that; otherwise use latest
3. Show changelog between current and target
4. Show affected configurations
5. Prompt for confirmation (unless --force)
6. Validate new configurations
7. Apply update
8. Update lockfile

#### Output Format

```
Updating team configurations...

Current Version: v1.2.0
Target Version: v1.3.0

Changelog:
  - feat: Add React 18 agent configuration
  - fix: Update backend agent for Node 20
  - chore: Remove deprecated configs

Changes:
  Added (1):
    + agents/react18-dev.md
  Updated (2):
    ~ agents/backend-dev.md
    ~ skills/testing/jest-runner.md
  Removed (1):
    - agents/deprecated-agent.md

Proceed with update? [y/N]
```

#### Examples

```bash
# Update to latest
oct update

# Update to specific version
oct update v1.3.0

# Preview update
oct update --dry-run

# Update without confirmation
oct update --force
```

---

### 8.7 Command: oct rollback

Rollback to a previous version.

#### Syntax

```
oct rollback [ref] [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `ref` | Target version to rollback to |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Show what would be rolled back | false |
| `--force` | Skip confirmation prompt | false |

#### Behavior

1. If ref not specified, show available versions
2. Validate target ref exists
3. Show what will change
4. Prompt for confirmation
5. Checkout target ref
6. Validate configurations
7. Apply sync
8. Update lockfile

#### Output Format

```
Available versions:
  * v1.3.0 (current)
    v1.2.0 - 3 days ago
    v1.1.0 - 1 week ago
    v1.0.0 - 2 weeks ago

Select version to rollback to: v1.2.0

Rolling back to v1.2.0...

Changes:
  Restored (1):
    + agents/deprecated-agent.md
  Reverted (2):
    ~ agents/backend-dev.md
    ~ skills/testing/jest-runner.md
  Removed (1):
    - agents/react18-dev.md

Proceed with rollback? [y/N]
```

#### Examples

```bash
# Interactive rollback
oct rollback

# Rollback to specific version
oct rollback v1.2.0

# Preview rollback
oct rollback v1.2.0 --dry-run

# Rollback without confirmation
oct rollback v1.2.0 --force
```

---

### 8.8 Command: oct remove

Remove a single configuration from the local sync.

#### Syntax

```
oct remove <name> [options]
```

#### Arguments

| Argument | Description |
|----------|-------------|
| `name` | Configuration name or path |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--type <type>` | Configuration type | (auto-detect) |
| `--force` | Skip confirmation prompt | false |

#### Behavior

1. Find configuration by name
2. Confirm removal
3. Delete local file
4. Update lockfile (mark as excluded)
5. Configuration will not be re-synced

#### Examples

```bash
# Remove by name
oct remove frontend-dev

# Remove with type specification
oct remove frontend-dev --type agent

# Remove without confirmation
oct remove frontend-dev --force
```

---

### 8.9 Command: oct clean

Remove all team configurations.

#### Syntax

```
oct clean [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--scope <scope>` | Scope to clean (global/project/all) | all |
| `--force` | Skip confirmation prompt | false |
| `--keep-lockfile` | Keep lockfile for re-sync | false |

#### Behavior

1. Show what will be removed
2. Prompt for confirmation
3. Delete all team/ directories
4. Delete lockfile (unless --keep-lockfile)
5. Clear cache

#### Output Format

```
This will remove all team configurations:

  Global:
    ~/.config/opencode/agent/team/ (5 files)
    ~/.config/opencode/skill/team/ (3 files)

  Project:
    .opencode/agent/team/ (2 files)

Total: 10 configurations will be removed

Proceed? [y/N]
```

#### Examples

```bash
# Clean all
oct clean

# Clean only global
oct clean --scope global

# Clean only project
oct clean --scope project

# Clean without confirmation
oct clean --force

# Clean but keep lockfile
oct clean --keep-lockfile
```

---

### 8.10 Command: oct info

Display system information and diagnostics.

#### Syntax

```
oct info [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--json` | Output in JSON format | false |

#### Output Format

```
OpenCode Team Sync
==================

Version: 1.0.0
Node.js: v18.17.0
Platform: darwin (arm64)

Paths:
  Global Config: ~/.config/opencode/
  Project Config: .opencode/
  Cache: ~/.cache/oct/

Repository:
  URL: https://github.com/company/team-configs
  Current Ref: v1.2.0
  Resolved Commit: abc123def456

Statistics:
  Agents: 5
  Skills: 3
  Last Sync: 2026-01-12 10:30:00
```

#### Examples

```bash
# Show info
oct info

# JSON output
oct info --json
```

---

## 9. Auto-Discovery

### 9.1 Discovery Mechanism

When no manifest is present, oct automatically discovers configurations:

```
1. Scan repository for known directories:
   - agents/, agent/
   - skills/, skill/
   
2. For each directory, scan for config files:
   - *.md (agents)
   - SKILL.md (skills)
   
3. Parse frontmatter/content to extract metadata
4. Build configuration list
```

### 9.2 Manifest Format

Optional `manifest.yaml` for explicit configuration:

```yaml
version: "1"
name: "Company Team Configs"
description: "Shared configurations for the engineering team"

defaults:
  tags: []
  
configurations:
  agents:
    - path: agents/frontend-dev.md
      tags: [frontend, react]
    - path: agents/backend-dev.md
      tags: [backend, nodejs]
      
  skills:
    - path: skills/testing/jest-runner.md
      tags: [testing]
    - path: skills/testing/playwright.md
      tags: [testing, e2e]
```

### 9.3 Discovery Priority

1. Manifest (if present) - highest priority
2. Frontmatter metadata in files
3. Directory structure inference
4. File extension inference - lowest priority

---

## 10. Auto-Check Updates

### 10.1 Update Check Flow

```
1. On CLI invocation (any command):
   a. Check if update check is due (based on interval)
   b. If due, spawn background process
   c. Background process fetches remote
   d. Compares with lockfile
   e. Writes result to cache file
   
2. On next CLI invocation:
   a. Read cached update check result
   b. If updates available, display notification
   c. Clear cache after displaying
```

### 10.2 Configuration

In `~/.config/oct/config.yaml`:

```yaml
updates:
  auto_check: true
  check_interval: 24h
  notify: true
```

### 10.3 Notification UX

```
$ oct status

╭─────────────────────────────────────────────╮
│  Update available: v1.3.0 (current: v1.2.0) │
│  Run 'oct update' to update                 │
╰─────────────────────────────────────────────╯

OpenCode Team Sync Status
========================
...
```

---

## 11. Error Handling

### 11.1 Error Categories

| Category | Code Range | Description |
|----------|------------|-------------|
| Input Errors | E1xx | Invalid user input |
| Git Errors | E2xx | Git operation failures |
| Validation Errors | E3xx | Schema/syntax validation |
| File System Errors | E4xx | File I/O issues |
| Network Errors | E5xx | Network connectivity |
| Internal Errors | E9xx | Unexpected errors |

### 11.2 Error Message Design

Each error includes:

1. **Code**: Unique identifier (e.g., E201)
2. **Message**: Clear description
3. **Context**: Relevant details
4. **Suggestion**: Recovery action

```
Error E201: Failed to clone repository

Repository: https://github.com/company/team-configs
Reason: Authentication failed

Suggestions:
  1. Check your Git credentials
  2. Ensure you have access to the repository
  3. Try: git clone https://github.com/company/team-configs

For more help, see: https://oct.dev/docs/errors/E201
```

### 11.3 Error Recovery

| Error | Auto-Recovery | User Action |
|-------|--------------|-------------|
| Network timeout | Retry 3 times | Check connection |
| Auth failure | None | Configure credentials |
| Validation failure | None | Fix upstream configs |
| File permission | None | Check permissions |
| Corrupt cache | Clear and retry | None needed |

---

## 12. Testing and Validation

### 12.1 Pre-Sync Validation

Before any sync operation:

1. Validate all configuration files
2. Check for naming conflicts
3. Verify file permissions
4. Ensure no orphaned files

### 12.2 Test Suite (for Maintainers)

| Test Type | Coverage Target | Tools |
|-----------|-----------------|-------|
| Unit Tests | 90% | Vitest |
| Integration Tests | 80% | Vitest + fixtures |
| E2E Tests | Critical paths | Custom harness |

### 12.3 Test Categories

```
tests/
├── unit/
│   ├── git-manager.test.ts
│   ├── discovery-engine.test.ts
│   ├── sync-engine.test.ts
│   ├── validation-engine.test.ts
│   └── tag-resolver.test.ts
├── integration/
│   ├── init-flow.test.ts
│   ├── sync-flow.test.ts
│   └── update-flow.test.ts
├── e2e/
│   ├── full-workflow.test.ts
│   └── error-scenarios.test.ts
└── fixtures/
    ├── valid-repo/
    ├── invalid-configs/
    └── edge-cases/
```

---

## 13. Security

### 13.1 Git Authentication

oct uses existing Git credentials:

- SSH keys
- Git credential helpers
- Personal access tokens

oct does NOT:

- Store credentials
- Manage authentication
- Bypass Git security

### 13.2 Sensitive Data

#### Detection

oct scans for potential secrets:

```typescript
const secretPatterns = [
  /password\s*[:=]/i,
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /token\s*[:=]/i,
  /private[_-]?key/i,
];
```

#### Handling

- Warn user during validation
- Block sync in strict mode
- Suggest environment variables

### 13.3 File Permissions

| File Type | Permissions |
|-----------|-------------|
| Config files | 644 |
| Lockfile | 644 |
| Cache directory | 700 |
| Cache files | 600 |

### 13.4 Path Sanitization

All paths are sanitized to prevent:

- Directory traversal attacks
- Symlink exploitation
- Absolute path injection

```typescript
function sanitizePath(path: string): string {
  // Remove .. components
  // Resolve to absolute within allowed directory
  // Reject if outside bounds
}
```

---

## 14. Performance

### 14.1 Targets

| Operation | Target | Measured |
|-----------|--------|----------|
| oct init (small repo) | < 5s | - |
| oct sync (no changes) | < 1s | - |
| oct sync (with changes) | < 3s | - |
| oct status | < 500ms | - |
| oct list | < 100ms | - |
| oct validate | < 2s | - |

### 14.2 Optimization Strategies

#### Caching

- Repository cached locally after clone
- Only fetch on sync/update
- Incremental updates with git fetch

#### Parallel Processing

- Validate multiple files concurrently
- Copy files in parallel
- Background update checks

#### Lazy Loading

- Load configurations on demand
- Parse frontmatter only when needed
- Defer validation until required

---

## 15. Use Cases

### 15.1 New Developer Onboarding

**Scenario**: A new developer joins the team and needs to set up OpenCode.

**Steps**:
```bash
# 1. Install oct
npm install -g @opencode/team-sync

# 2. Initialize with team repo
oct init https://github.com/company/team-configs

# 3. Verify setup
oct status

# 4. Start using OpenCode with team configs
opencode
```

**Outcome**: Developer has all team configurations in < 2 minutes.

---

### 15.2 Team Lead Publishing Configs

**Scenario**: Team lead creates new agent configuration for the team.

**Steps**:
```bash
# 1. Create configuration locally
cd team-configs
vim agents/new-feature-agent.md

# 2. Validate before commit
oct validate agents/new-feature-agent.md

# 3. Commit and tag
git add agents/new-feature-agent.md
git commit -m "feat: Add new feature agent"
git tag v1.4.0
git push origin main --tags

# 4. Notify team
# Team members run: oct update
```

**Outcome**: New configuration available to all team members.

---

### 15.3 Multi-Project Setup

**Scenario**: Developer works on multiple projects with different configurations.

**Steps**:
```bash
# Project A - Frontend
cd project-a
oct init https://github.com/company/frontend-configs --scope project

# Project B - Backend
cd project-b
oct init https://github.com/company/backend-configs --scope project

# Each project has isolated configs
```

**Outcome**: Project-specific configurations without conflicts.

---

### 15.4 Personal Override

**Scenario**: Developer wants to customize a team agent.

**Steps**:
```bash
# 1. Copy team config to personal
cp ~/.config/opencode/agent/team/frontend-dev.md \
   ~/.config/opencode/agent/personal/frontend-dev.md

# 2. Edit personal copy
vim ~/.config/opencode/agent/personal/frontend-dev.md

# 3. Personal version takes precedence
# Team updates won't overwrite personal
```

**Outcome**: Developer has customized config that persists through updates.

---

### 15.5 Rolling Back Bad Update

**Scenario**: Team lead accidentally pushes broken configuration.

**Steps**:
```bash
# 1. Developer syncs and gets broken config
oct update
# Error: Validation failed...

# 2. Rollback to previous version
oct rollback v1.3.0

# 3. Team lead fixes and releases v1.4.1
# Developer updates when ready
oct update v1.4.1
```

**Outcome**: Developer can continue working despite upstream issues.

---

### 15.6 Tag-Based Filtering

**Scenario**: Frontend developer only wants frontend configurations.

**Steps**:
```bash
# 1. Initialize with tag filter
oct init https://github.com/company/team-configs --tags frontend

# 2. Only frontend configs are synced
oct list
# Shows only frontend-tagged configs

# 3. Later, add more tags if needed
oct sync --tags frontend,testing
```

**Outcome**: Developer has only relevant configurations.

---

## 16. Technical Implementation

### 16.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 18+ | Modern features, wide adoption |
| Language | TypeScript 5.0+ | Type safety, better DX |
| CLI Framework | Commander.js | Industry standard, well-documented |
| Git Operations | simple-git | Reliable, promise-based |
| Validation | Zod | Type-safe, excellent DX |
| Logging | Winston | Flexible, configurable |
| Testing | Vitest | Fast, ESM-native |
| Bundler | tsup | Fast, zero-config |

### 16.2 Project Structure

```
oct/
├── src/
│   ├── cli/
│   │   ├── index.ts           # Entry point
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── sync.ts
│   │   │   ├── status.ts
│   │   │   ├── list.ts
│   │   │   ├── validate.ts
│   │   │   ├── update.ts
│   │   │   ├── rollback.ts
│   │   │   ├── remove.ts
│   │   │   ├── clean.ts
│   │   │   └── info.ts
│   │   └── utils/
│   │       ├── output.ts
│   │       └── prompts.ts
│   ├── core/
│   │   ├── git-manager.ts
│   │   ├── discovery-engine.ts
│   │   ├── sync-engine.ts
│   │   ├── validation-engine.ts
│   │   ├── namespace-manager.ts
│   │   ├── lockfile-manager.ts
│   │   ├── tag-resolver.ts
│   │   └── config-manager.ts
│   ├── schemas/
│   │   ├── agent.ts
│   │   ├── skill.ts
│   │   ├── manifest.ts
│   │   └── lockfile.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts
│       ├── paths.ts
│       └── errors.ts
├── tests/
├── docs/
├── package.json
├── tsconfig.json
└── README.md
```

### 16.3 Core Interfaces

```typescript
// Configuration Types
interface AgentConfig {
  name: string;
  description?: string;
  tags?: string[];
  content: string;
  path: string;
}

interface SkillConfig {
  name: string;
  description?: string;
  tags?: string[];
  commands?: string[];
  content: string;
  path: string;
}

// Lockfile
interface Lockfile {
  version: string;
  repository: string;
  ref: string;
  resolvedCommit: string;
  syncedAt: string;
  scope: 'global' | 'project';
  configs: LockfileEntry[];
}

interface LockfileEntry {
  path: string;
  type: 'agent' | 'skill';
  destination: string;
  hash: string;
  tags: string[];
}

// Sync Result
interface SyncResult {
  added: ConfigChange[];
  updated: ConfigChange[];
  removed: ConfigChange[];
  unchanged: ConfigChange[];
  errors: SyncError[];
}

interface ConfigChange {
  path: string;
  type: 'agent' | 'skill';
  oldHash?: string;
  newHash?: string;
}
```

---

## 17. Documentation Requirements

### 17.1 User Documentation

| Document | Purpose | Priority |
|----------|---------|----------|
| README.md | Quick start, overview | Must Have |
| Installation Guide | Detailed installation | Must Have |
| CLI Reference | All commands documented | Must Have |
| Configuration Guide | Config file formats | Must Have |
| Troubleshooting | Common issues, solutions | Should Have |
| FAQ | Frequently asked questions | Should Have |

### 17.2 Team Repository Template

Provide a template repository with:

- Example agents (3-5)
- Example skills (2-3)
- Sample manifest.yaml
- README with customization guide
- MCP server documentation template (for team repos)

### 17.3 Developer Documentation

| Document | Purpose | Priority |
|----------|---------|----------|
| ARCHITECTURE.md | System design | Must Have |
| CONTRIBUTING.md | Contribution guide | Must Have |
| API Reference | Internal APIs | Should Have |
| Testing Guide | How to run tests | Should Have |

---

## 18. Roadmap

### 18.1 Phase 1: Core (Current)

- All 10 CLI commands
- Git-based versioning
- Tag-based filtering
- Schema validation
- Namespace isolation
- Auto-discovery

### 18.2 Phase 2: Enhanced

- GUI/TUI interface
- Web dashboard
- Conflict resolution UI
- Config inheritance
- Team analytics

### 18.3 Phase 3: Enterprise

- Multi-team support
- RBAC permissions
- Audit logging
- Compliance features
- SSO integration

---

## 19. Success Metrics

### 19.1 Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync time (p95) | < 3s | Performance tests |
| Validation time | < 2s | Performance tests |
| Test coverage | > 90% | CI pipeline |
| Error rate | < 0.1% | Error tracking |

### 19.2 User Experience KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding time | < 5 min | User testing |
| Commands to sync | 2 | CLI design |
| Error clarity | 90% resolved | User feedback |
| Documentation NPS | > 50 | Survey |

### 19.3 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Adoption rate | 80% of teams | Analytics |
| Config consistency | 100% | Audits |
| Support tickets | < 1/month/team | Support system |

---

## 20. Risks and Mitigations

### 20.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Git auth complexity | Medium | High | Use native Git credentials |
| Config conflicts | Low | Medium | Clear namespace isolation |
| Breaking changes | Medium | High | Semantic versioning, lockfile |
| Network dependency | Low | Medium | Offline mode after sync |
| Large repositories | Low | Medium | Lazy loading, caching |

### 20.2 Mitigation Strategies

#### Git Authentication
- Rely entirely on existing Git setup
- Document authentication options
- Provide troubleshooting guide

#### Configuration Conflicts
- Strict namespace separation
- Clear precedence rules
- Never modify personal configs

#### Breaking Changes
- Follow semantic versioning
- Lockfile ensures reproducibility
- Rollback always available

---

## 21. Appendices

### 21.1 Glossary

| Term | Definition |
|------|------------|
| Agent | AI assistant configuration (personality, capabilities) |
| Skill | Task-specific capability for agents |
| MCP Server | Model Context Protocol server (configured in opencode.json, not synced) |
| Namespace | Isolated directory scope (team/personal) |
| Lockfile | File tracking sync state and versions |
| Manifest | Optional explicit configuration list |
| Tag | Categorical label for filtering |

### 21.2 References

- OpenCode Documentation: https://opencode.ai/docs
- Git Documentation: https://git-scm.com/doc
- MCP Specification: https://modelcontextprotocol.io
- Zod Documentation: https://zod.dev
- Commander.js: https://github.com/tj/commander.js

### 21.3 Alternatives Considered

| Decision | Chosen | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Distribution | File-based | HTTP API, P2P | Simplicity, Git leverage |
| Versioning | Git-based | Custom versioning | Industry standard |
| Validation | Zod | JSON Schema, Joi | TypeScript integration |
| CLI Framework | Commander | Yargs, Oclif | Simplicity, adoption |

### 21.4 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-11 | Use Git for versioning | Leverage existing infrastructure |
| 2026-01-11 | Directory-based namespaces | Clear separation, simple |
| 2026-01-11 | Tag-based filtering | Flexible, intuitive |
| 2026-01-11 | Zod for validation | Type-safe, excellent DX |
| 2026-01-11 | Commander.js for CLI | Industry standard |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-12 | OpenCode Team | Initial specification |

---

*End of Specification Document*
