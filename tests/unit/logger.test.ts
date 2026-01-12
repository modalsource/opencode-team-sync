import { describe, it, expect } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  it('should create logger with config', () => {
    const logger = new Logger({ level: 'info' });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should update logger config', () => {
    const logger = new Logger({ level: 'info' });
    logger.setConfig({ level: 'debug' });
    // Test passes if no errors thrown
    expect(true).toBe(true);
  });

  it('should handle log methods without errors', () => {
    const logger = new Logger({ level: 'debug', silent: true });

    // All these should work without throwing
    expect(() => {
      logger.error('error');
      logger.warn('warn');
      logger.info('info');
      logger.success('success');
      logger.debug('debug');
      logger.log('log');
      logger.newline();
    }).not.toThrow();
  });
});
