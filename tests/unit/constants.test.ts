import { describe, it, expect } from 'vitest';
import {
  getConfigDir,
  getConfigPath,
  getLockfilePath,
  DEFAULT_SCOPE,
  TAG_PATTERN,
} from '../../src/utils/constants.js';

describe('Constants', () => {
  it('should return correct config dir for global scope', () => {
    const dir = getConfigDir('global');
    expect(dir).toContain('.config/opencode');
  });

  it('should return correct config dir for project scope', () => {
    const dir = getConfigDir('project');
    expect(dir).toBe('.opencode');
  });

  it('should return correct config path', () => {
    const path = getConfigPath('project', 'agent', 'team');
    expect(path).toBe('.opencode/agent/team');
  });

  it('should return correct lockfile path', () => {
    const path = getLockfilePath('project');
    expect(path).toBe('.opencode/.opencode-team.lock');
  });

  it('should validate tags with TAG_PATTERN', () => {
    expect(TAG_PATTERN.test('frontend')).toBe(true);
    expect(TAG_PATTERN.test('backend-api')).toBe(true);
    expect(TAG_PATTERN.test('team-alpha')).toBe(true);
    expect(TAG_PATTERN.test('Frontend')).toBe(false); // uppercase
    expect(TAG_PATTERN.test('frontend_api')).toBe(false); // underscore
    expect(TAG_PATTERN.test('-frontend')).toBe(false); // starts with dash
    expect(TAG_PATTERN.test('frontend-')).toBe(false); // ends with dash
  });

  it('should have correct default scope', () => {
    expect(DEFAULT_SCOPE).toBe('global');
  });
});
