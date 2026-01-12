import { describe, it, expect } from 'vitest';
import {
  getBaseConfigDir,
  getNamespacePath,
  getLockfilePath,
  normalizePath,
  resolveConfigName,
  getDestinationPath,
  sanitizeConfigName,
  isPathInside,
} from '../../src/utils/path-utils.js';

describe('Path Utils', () => {
  describe('getBaseConfigDir', () => {
    it('should return global config dir for global scope', () => {
      const dir = getBaseConfigDir('global');
      expect(dir).toContain('.config/opencode');
    });

    it('should return project config dir for project scope', () => {
      const dir = getBaseConfigDir('project');
      expect(dir).toBe('.opencode');
    });
  });

  describe('getNamespacePath', () => {
    it('should construct correct path for global team agent', () => {
      const path = getNamespacePath('global', 'agent', 'team');
      expect(path).toContain('agent/team');
    });

    it('should construct correct path for project personal skill', () => {
      const path = getNamespacePath('project', 'skill', 'personal');
      expect(path).toBe('.opencode/skill/personal');
    });
  });

  describe('getLockfilePath', () => {
    it('should return correct lockfile path for global scope', () => {
      const path = getLockfilePath('global');
      expect(path).toContain('.opencode-team.lock');
    });

    it('should return correct lockfile path for project scope', () => {
      const path = getLockfilePath('project');
      expect(path).toBe('.opencode/.opencode-team.lock');
    });
  });

  describe('normalizePath', () => {
    it('should normalize Windows paths to Unix format', () => {
      const path = normalizePath('foo\\bar\\baz');
      expect(path).toBe('foo/bar/baz');
    });

    it('should handle already normalized paths', () => {
      const path = normalizePath('foo/bar/baz');
      expect(path).toBe('foo/bar/baz');
    });
  });

  describe('resolveConfigName', () => {
    it('should extract name from agent path', () => {
      const name = resolveConfigName('agents/frontend-dev.md', 'agent');
      expect(name).toBe('frontend-dev');
    });

    it('should extract name from skill path with directory', () => {
      const name = resolveConfigName('skills/testing/jest-runner.md', 'skill');
      expect(name).toBe('testing/jest-runner');
    });

    it('should extract name from MCP path', () => {
      const name = resolveConfigName('mcp/database.json', 'mcp');
      expect(name).toBe('database');
    });
  });

  describe('getDestinationPath', () => {
    it('should construct correct destination for agent', () => {
      const path = getDestinationPath('project', 'agent', 'team', 'frontend-dev');
      expect(path).toBe('.opencode/agent/team/frontend-dev.md');
    });

    it('should construct correct destination for skill with directory', () => {
      const path = getDestinationPath('project', 'skill', 'personal', 'testing/jest');
      expect(path).toBe('.opencode/skill/personal/testing/jest/SKILL.md');
    });

    it('should construct correct destination for MCP', () => {
      const path = getDestinationPath('global', 'mcp', 'team', 'database.json');
      expect(path).toContain('mcp/team/database.json');
    });
  });

  describe('sanitizeConfigName', () => {
    it('should sanitize invalid characters', () => {
      const name = sanitizeConfigName('My Cool Agent!');
      expect(name).toBe('My-Cool-Agent');
    });

    it('should remove leading/trailing dashes', () => {
      const name = sanitizeConfigName('-frontend-dev-');
      expect(name).toBe('frontend-dev');
    });

    it('should preserve valid names', () => {
      const name = sanitizeConfigName('frontend-dev_v2');
      expect(name).toBe('frontend-dev_v2');
    });
  });

  describe('isPathInside', () => {
    it('should return true for child path', () => {
      const result = isPathInside('/parent/child/file.txt', '/parent');
      expect(result).toBe(true);
    });

    it('should return false for path outside parent', () => {
      const result = isPathInside('/other/file.txt', '/parent');
      expect(result).toBe(false);
    });

    it('should return false for parent path', () => {
      const result = isPathInside('/parent', '/parent/child');
      expect(result).toBe(false);
    });
  });
});
