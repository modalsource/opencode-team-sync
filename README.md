# OpenCode Team Sync (oct)

> Synchronize and manage OpenCode configurations across your team

[![npm version](https://img.shields.io/npm/v/opencode-team.svg)](https://www.npmjs.com/package/opencode-team)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI Status](https://github.com/your-org/opencode-team/workflows/CI/badge.svg)](https://github.com/your-org/opencode-team/actions)

---

## 🎯 What is OpenCode Team Sync?

OpenCode Team Sync is a CLI tool that enables teams to share and synchronize [OpenCode](https://opencode.ai) configurations (agents and skills) across team members through Git repositories.

**Key Benefits**:
- 📦 **Standardize team workflows** - Share common agents and skills configurations
- 🚀 **Faster onboarding** - New developers get team configurations in seconds
- 🔄 **Easy updates** - Sync latest configurations with a single command
- 🛡️ **Namespace isolation** - Keep personal and team configurations separate
- 🏷️ **Tag-based filtering** - Sync only what you need with flexible tagging
- 📌 **Version control** - Pin to specific versions, easily rollback changes

---

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Commands](#commands)
- [Configuration](#configuration)
- [Examples](#examples)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🚀 Installation

### Via npm (Recommended)

```bash
npm install -g opencode-team
```

### Via Homebrew (macOS/Linux)

```bash
brew install your-org/tap/opencode-team
```

### Via Binary Download

Download the latest release from [GitHub Releases](https://github.com/your-org/opencode-team/releases).

### Requirements

- Node.js 18+
- Git
- OpenCode 1.0+

---

## ⚡ Quick Start

### 1. Initialize Team Configurations

```bash
# From your project directory
oct init https://github.com/your-company/opencode-configs
```

This will:
- Clone the team configuration repository
- Validate all configurations
- Sync them to your local OpenCode setup
- Create a lockfile to track versions

### 2. Use OpenCode with Team Configurations

```bash
opencode
```

Your OpenCode is now configured with team agents and skills!

### 3. Check Status

```bash
oct status
```

### 4. Update Configurations

```bash
# Check for updates
oct status

# Apply updates
oct update
```

---

## 💡 Core Concepts

### Namespace Isolation

Team configurations are kept separate from your personal configurations:

```
~/.config/opencode/
├── agent/
│   ├── team/          # ← Team configurations (read-only)
│   │   └── frontend-dev.md
│   └── personal/      # ← Your personal configurations
│       └── my-agent.md
└── skill/
    ├── team/
    └── personal/
```

**Personal configurations always take precedence** over team configurations with the same name.

### Git-Based Versioning

Configurations are versioned using Git:
- Pin to specific tags: `oct init repo --ref v1.0.0`
- Pin to branches: `oct init repo --ref main`  
- Pin to commits: `oct init repo --ref abc123`

### Tag-Based Filtering

Filter which configurations to sync using tags:

```bash
# Sync only frontend configurations
oct sync --tags frontend,react

# Exclude experimental configurations
oct sync --exclude-tags experimental
```

---

## 📚 Commands

### `oct init <repository-url>`

Initialize team configurations from a repository.

```bash
oct init https://github.com/company/team-configs

# Options:
oct init <repo> --ref v1.0.0      # Pin to specific version
oct init <repo> --global          # Install globally (not project-specific)
oct init <repo> --tags frontend   # Initial tag filter
```

### `oct sync`

Synchronize configurations from the team repository.

```bash
oct sync

# Options:
oct sync --tags frontend,react    # Filter by tags
oct sync --exclude-tags experimental
oct sync --dry-run                # Preview changes
oct sync --force-team             # Team configs override personal
```

### `oct status`

Show current status and check for updates.

```bash
oct status
```

Output:
```
Repository: https://github.com/company/team-configs
Current: v1.2.0
Status: Update available (v1.3.0)

Synced configs:
  - 3 agents
  - 5 skills

Run 'oct update' to upgrade
```

### `oct update`

Update to the latest version.

```bash
oct update

# Options:
oct update --dry-run              # Preview changes
oct update --to v1.3.0            # Update to specific version
```

### `oct list`

List all configurations.

```bash
oct list

# Options:
oct list --type agent             # Filter by type
oct list --tags frontend          # Filter by tags
oct list --json                   # JSON output
```

### `oct validate`

Validate configurations.

```bash
oct validate                      # Validate local configs
oct validate --remote             # Validate remote before sync
```

### `oct rollback`

Rollback to a previous version.

```bash
oct rollback                      # Rollback to previous version
oct rollback --to v1.0.0          # Rollback to specific version
```

### `oct remove`

Remove a specific configuration.

```bash
oct remove frontend-dev --type agent
```

### `oct clean`

Remove all team configurations (keeps personal).

```bash
oct clean
oct clean --force                 # Skip confirmation
```

### `oct info`

Show system information.

```bash
oct info
```

---

## ⚙️ Configuration

### Team Repository Structure

Your team configuration repository should follow this structure:

```
team-configs/
├── .opencode-team.yaml          # Manifest (optional)
├── agents/
│   ├── frontend-dev.md
│   └── backend-api.md
└── skills/
    ├── git-release/
    │   └── SKILL.md
    └── pr-review/
        └── SKILL.md
```

### Manifest File (`.opencode-team.yaml`)

Optional manifest file for metadata and configuration:

```yaml
version: "1"
name: "Company Team Configs"
description: "Shared OpenCode configurations"

# Global tags applied to all configs
globalTags: [company, production]

# Explicit configuration list (optional, overrides auto-discovery)
configs:
  - path: agents/frontend-dev.md
    type: agent
    tags: [frontend, react, typescript]
    
  - path: skills/git-release/SKILL.md
    type: skill
    tags: [git, release, all-projects]

# Policies
policies:
  minOpencodeVersion: "1.0.0"
  requireValidation: true
  autoCheckUpdates: true
  checkIntervalHours: 24
```

### Lockfile (`.opencode-team.lock`)

Generated automatically, tracks synced state:

```yaml
version: "1"
repository: "https://github.com/company/team-configs"
ref: "v1.2.0"
resolved_commit: "abc123def456"
synced_at: "2026-01-11T10:30:00Z"
configs:
  - path: "agents/frontend-dev.md"
    type: "agent"
    hash: "sha256:abcd1234..."
    tags: ["frontend", "react"]
```

---

## 🎨 Examples

### Example 1: Onboarding New Developer

```bash
# Clone project
git clone https://github.com/company/app

# Initialize team configs
cd app
oct init https://github.com/company/team-configs

# Start using OpenCode with team setup
opencode
```

### Example 2: Multi-Project Setup

```bash
# Project A - Frontend configs
cd ~/projects/frontend-app
oct init https://github.com/company/frontend-configs --tags frontend

# Project B - Backend configs  
cd ~/projects/backend-api
oct init https://github.com/company/backend-configs --tags backend
```

### Example 3: Creating Personal Override

```bash
# Team provides 'frontend-dev' agent
oct list
# → frontend-dev (team)

# Create personal version with customizations
cd ~/.config/opencode/agent/personal/
cp ../team/frontend-dev.md ./frontend-dev.md
vim frontend-dev.md  # Make changes

# Personal version now takes precedence
opencode
# → Warning: frontend-dev (personal) overrides team config
```

### Example 4: Update Workflow

```bash
# Developer receives notification
oct status
# → Updates available: v1.2.0 -> v1.3.0

# Preview changes
oct update --dry-run
# → Would update:
#   - agents/frontend-dev.md
#   - skills/security-check/SKILL.md

# Apply update
oct update
# → Updated 2 configurations
```

---

## 📖 Documentation

Full documentation available at:

- **[Complete Specifications](SPECS.md)** - Detailed project specifications
- **[Phase 1 Roadmap](ROADMAP.md)** - Development plan and timeline  
- **[Architecture Guide](ARCHITECTURE.md)** - Technical architecture

---

## 🤝 Contributing

We welcome contributions! Please see the documentation for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/opencode-team
cd opencode-team

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm link
oct --help
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 📊 Project Status

**Current Phase**: Phase 1 MVP Implementation  
**Target Release**: Q1 2026  
**Status**: 🚧 In Active Development

### Development Progress

#### ✅ Completed (Weeks 1-2)

**Week 1: Project Foundation**
- ✅ TypeScript project setup with strict mode
- ✅ Build pipeline (tsup) and testing (Vitest)
- ✅ CLI framework with Commander.js
- ✅ Core type system and error hierarchy
- ✅ CI/CD pipelines (GitHub Actions)
- ✅ 12 initial unit tests

**Week 2: Core Modules**
- ✅ GitManager: Full Git operations support
- ✅ FileSystemManager: Complete file operations
- ✅ Path utilities for cross-platform support
- ✅ Zod schemas for all configuration types
- ✅ Comprehensive validators (Agent, Skill, Manifest, Lockfile)
- ✅ 58 unit tests passing (80%+ coverage on core modules)

#### 🚧 In Progress (Week 3)

**Week 3-4: CLI Commands Part 1**
- 🚧 `oct init` command implementation
- 🚧 Lockfile management
- 📋 `oct sync` command

#### 📋 Upcoming

**Week 5-6: CLI Commands Part 2**
- `oct status`, `oct list`, `oct validate`
- `oct update`, `oct rollback`
- `oct remove`, `oct clean`, `oct info`

**Week 7-8: Advanced Features**
- Auto-discovery engine
- Tag filtering system
- Namespace isolation manager
- Error handling refinements

**Week 9-10: Testing & Release**
- Integration tests
- Performance testing
- Documentation
- Beta release

See [ROADMAP.md](ROADMAP.md) for detailed timeline and task breakdown.

### Test Coverage

- **58 unit tests passing**
- Core modules: 80%+ coverage
- Type checking: ✅ Passing
- Linting: ✅ Passing
- Build: ✅ Successful

### Future Phases

- 🔮 Phase 2: Enhanced Features
  - Multiple team config sources
  - Interactive TUI mode
  - Config templates
- 🔮 Phase 3: Advanced Features
  - Plugin system
  - Web dashboard (optional)

---

## 🔒 Security

### Reporting Security Issues

Please report security vulnerabilities to security@your-company.com.

### Security Considerations

- Team configurations are read-only locally
- Personal configurations are isolated in separate namespace
- Git authentication uses standard Git credentials (SSH/HTTPS)
- No secrets should be stored in team configurations
- Use environment variables for sensitive data: `{env:VAR_NAME}`

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- [OpenCode](https://opencode.ai) - The AI coding agent
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [simple-git](https://github.com/steveukx/git-js) - Git operations

---

## 📞 Support

- 📖 [Documentation](SPECS.md)
- 🐛 [Issue Tracker](https://github.com/your-org/opencode-team/issues)
- 📧 Email: support@your-company.com

---

**Made with ❤️ for the OpenCode community**
