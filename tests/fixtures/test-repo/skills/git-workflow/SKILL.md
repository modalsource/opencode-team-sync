---
description: "Git workflow skill for managing branches and commits"
tags:
  - git
  - workflow
  - version-control
---

# Git Workflow Skill

This skill provides guidance on Git workflows and best practices.

## Branch Strategy

### Main branches
- `main` - production-ready code
- `develop` - integration branch for features

### Supporting branches
- `feature/*` - new features
- `bugfix/*` - bug fixes
- `hotfix/*` - urgent production fixes

## Commit Messages

Follow conventional commits:
- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation
- `style:` - formatting
- `refactor:` - code refactoring
- `test:` - adding tests
- `chore:` - maintenance

## Common Workflows

### Starting a new feature
```bash
git checkout -b feature/my-feature develop
# work on feature
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### Creating a pull request
```bash
# Ensure feature is up to date with develop
git checkout develop
git pull
git checkout feature/my-feature
git rebase develop
git push -f origin feature/my-feature
# Create PR on GitHub
```
