import { describe, it, expect } from 'vitest';
import { ErrorCode, OpenCodeTeamError, GitCloneError } from '../../src/utils/errors.js';

describe('Error System', () => {
  it('should create base OpenCodeTeamError', () => {
    const error = new OpenCodeTeamError('Test error', ErrorCode.UNKNOWN_ERROR, { foo: 'bar' });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(error.context).toEqual({ foo: 'bar' });
  });

  it('should create GitCloneError', () => {
    const error = new GitCloneError('https://github.com/test/repo');

    expect(error).toBeInstanceOf(OpenCodeTeamError);
    expect(error.message).toContain('Failed to clone');
    expect(error.code).toBe(ErrorCode.GIT_CLONE_ERROR);
  });

  it('should serialize error to JSON', () => {
    const error = new OpenCodeTeamError('Test error', ErrorCode.UNKNOWN_ERROR, { foo: 'bar' });

    const json = error.toJSON();

    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('code');
    expect(json).toHaveProperty('context');
  });
});
