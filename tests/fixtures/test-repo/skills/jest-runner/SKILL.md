---
description: "Test automation skill for running Jest tests"
tags:
  - testing
  - jest
  - automation
---

# Jest Test Runner Skill

This skill helps you run and manage Jest tests in your project.

## Usage

Use this skill when you need to:
- Run all tests
- Run specific test files
- Run tests in watch mode
- Generate coverage reports

## Commands

### Run all tests
```bash
npm test
```

### Run specific file
```bash
npm test -- path/to/test.test.ts
```

### Watch mode
```bash
npm test -- --watch
```

### Coverage
```bash
npm test -- --coverage
```

## Tips

- Use `describe` blocks to organize tests
- Use `it` or `test` for individual test cases
- Mock external dependencies
- Test edge cases
