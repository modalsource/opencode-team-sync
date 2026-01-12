import type { Command } from 'commander';
import { getLogger, type Logger } from '../utils/logger.js';
import type { ConfigScope } from '../types/index.js';

/**
 * Common options for all commands
 */
export interface CommonOptions {
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;
  scope?: ConfigScope;
}

/**
 * Base class for all CLI commands
 */
export abstract class BaseCommand<TOptions extends CommonOptions = CommonOptions> {
  protected logger: Logger;
  protected options: TOptions;

  constructor(options: TOptions) {
    this.logger = getLogger();
    this.options = options;
  }

  /**
   * Execute the command
   */
  abstract execute(): Promise<void>;

  /**
   * Validate command options and prerequisites
   */
  protected async validate(): Promise<void> {
    // Override in subclasses to add validation
  }

  /**
   * Run the command with error handling
   */
  async run(): Promise<void> {
    try {
      await this.validate();
      await this.execute();
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error);
      } else {
        this.logger.error('An unknown error occurred');
      }
      throw error;
    }
  }

  /**
   * Determine the scope (global or project) for the command
   */
  protected resolveScope(): ConfigScope {
    if (this.options.scope) {
      return this.options.scope;
    }
    // Default scope logic can be enhanced later
    return 'global';
  }
}

/**
 * Helper to create a command action handler
 */
export function createCommandAction<TOptions extends CommonOptions>(
  CommandClass: new (options: TOptions) => BaseCommand<TOptions>
): (options: TOptions) => Promise<void> {
  return async (options: TOptions) => {
    const command = new CommandClass(options);
    await command.run();
  };
}

/**
 * Helper to add common options to a command
 */
export function addCommonOptions(command: Command): Command {
  return command
    .option('-v, --verbose', 'Enable verbose output')
    .option('-q, --quiet', 'Suppress all output except errors')
    .option('-d, --debug', 'Enable debug mode with stack traces');
}
