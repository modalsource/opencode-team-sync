import chalk from 'chalk';
import type { LOG_LEVELS } from './constants.js';

/**
 * Log level type
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  silent?: boolean;
  debug?: boolean;
}

/**
 * Simple logger for CLI output
 */
export class Logger {
  private config: LoggerConfig;
  private levelPriority: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Check if a log level should be printed
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.config.silent) return false;
    return this.levelPriority[level] <= this.levelPriority[this.config.level];
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error): void {
    if (!this.shouldLog('error')) return;
    console.error(chalk.red('✖'), message);
    if (error && this.config.debug) {
      console.error(chalk.dim(error.stack || error.message));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    if (!this.shouldLog('warn')) return;
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.green('✔'), message);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    console.log(chalk.dim('⚙'), chalk.dim(message));
    if (data) {
      console.log(chalk.dim(JSON.stringify(data, null, 2)));
    }
  }

  /**
   * Log a plain message (no prefix)
   */
  log(message: string): void {
    if (this.config.silent) return;
    console.log(message);
  }

  /**
   * Create a new line
   */
  newline(): void {
    if (this.config.silent) return;
    console.log();
  }

  /**
   * Update logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger({ level: 'info' });
  }
  return globalLogger;
}

/**
 * Set the global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}
