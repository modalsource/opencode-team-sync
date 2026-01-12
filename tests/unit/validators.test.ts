import { describe, it, expect } from 'vitest';
import {
  AgentValidator,
  SkillValidator,
  McpValidator,
} from '../../src/core/validator/validators.js';
import type { ConfigEntry } from '../../src/types/index.js';

const mockConfigEntry: ConfigEntry = {
  path: 'test.md',
  type: 'agent',
  name: 'test',
  hash: 'abc123',
  tags: [],
};

describe('Validators', () => {
  describe('AgentValidator', () => {
    const validator = new AgentValidator();

    it('should validate valid agent with frontmatter', () => {
      const content = `---
name: Frontend Developer
description: A frontend development agent
tags:
  - frontend
  - react
---

# Frontend Developer Agent

You are a frontend development specialist...`;

      const result = validator.validate(content, mockConfigEntry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when no frontmatter', () => {
      const content = `# Agent without frontmatter

Some content here`;

      const result = validator.validate(content, mockConfigEntry);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('no frontmatter');
    });

    it('should error when no content after frontmatter', () => {
      const content = `---
name: Test Agent
---
`;

      const result = validator.validate(content, mockConfigEntry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn when content is very short', () => {
      const content = `---
name: Test Agent
---

Short.`;

      const result = validator.validate(content, mockConfigEntry);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('SkillValidator', () => {
    const validator = new SkillValidator();

    it('should validate valid skill', () => {
      const content = `---
name: Jest Runner
description: Run Jest tests
tags:
  - testing
  - jest
---

# Jest Runner

This skill runs Jest tests...`;

      const skillEntry: ConfigEntry = { ...mockConfigEntry, type: 'skill' };
      const result = validator.validate(content, skillEntry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate skill names', () => {
      expect(validator.validateName('simple-skill')).toBe(true);
      expect(validator.validateName('testing/jest-runner')).toBe(true);
      expect(validator.validateName('skill_with_underscore')).toBe(true);
      expect(validator.validateName('Invalid Skill!')).toBe(false);
    });
  });

  describe('McpValidator', () => {
    const validator = new McpValidator();

    it('should validate valid MCP config', () => {
      const content = JSON.stringify({
        name: 'Database Server',
        command: 'node',
        args: ['server.js'],
        env: {
          PORT: '3000',
        },
      });

      const mcpEntry: ConfigEntry = { ...mockConfigEntry, type: 'mcp' };
      const result = validator.validate(content, mcpEntry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error on invalid JSON', () => {
      const content = '{ invalid json }';

      const mcpEntry: ConfigEntry = { ...mockConfigEntry, type: 'mcp' };
      const result = validator.validate(content, mcpEntry);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('should warn about potential secrets', () => {
      const content = JSON.stringify({
        command: 'node',
        env: {
          API_KEY: 'secret123',
          PASSWORD: 'mypass',
        },
      });

      const mcpEntry: ConfigEntry = { ...mockConfigEntry, type: 'mcp' };
      const result = validator.validate(content, mcpEntry);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes('secret'))).toBe(true);
    });

    it('should error when command is missing', () => {
      const content = JSON.stringify({
        name: 'Test Server',
        args: ['test'],
      });

      const mcpEntry: ConfigEntry = { ...mockConfigEntry, type: 'mcp' };
      const result = validator.validate(content, mcpEntry);
      expect(result.valid).toBe(false);
    });
  });
});
