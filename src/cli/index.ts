import { Command } from 'commander';
import { getLogger } from '../utils/logger.js';
import { OpenCodeTeamError } from '../utils/errors.js';
import { InitCommand } from './commands/init.js';
import { SyncCommand } from './commands/sync.js';

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const logger = getLogger();
  const program = new Command();

  program
    .name('oct')
    .description('CLI tool for synchronizing OpenCode configurations across teams')
    .version('1.0.0-beta.1')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-q, --quiet', 'Suppress all output except errors')
    .option('-d, --debug', 'Enable debug mode with stack traces')
    .hook('preAction', (thisCommand) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const opts = thisCommand.opts();
      logger.setConfig({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        level: opts.debug ? 'debug' : opts.verbose ? 'info' : 'warn',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        silent: opts.quiet,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        debug: opts.debug,
      });
    });

  // Init command
  program
    .command('init')
    .description('Initialize team configurations from a Git repository')
    .argument('<repository>', 'Git repository URL')
    .option('-r, --ref <ref>', 'Git ref (branch/tag/commit)', 'main')
    .option('-g, --global', 'Install globally (default: project-level)')
    .option('-t, --tags <tags>', 'Initial tag filter (comma-separated)')
    .option('-e, --exclude-tags <tags>', 'Initial exclude tag filter (comma-separated)')
    .option('-f, --force', 'Force re-initialization')
    .action(async (repository: string, opts: any) => {
      const command = new InitCommand({
        repository,
        ref: opts.ref,
        scope: opts.global ? 'global' : 'project',
        tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined,
        excludeTags: opts.excludeTags
          ? opts.excludeTags.split(',').map((t: string) => t.trim())
          : undefined,
        force: opts.force,
        verbose: opts.verbose,
        quiet: opts.quiet,
        debug: opts.debug,
      });
      await command.run();
    });

  // Sync command
  program
    .command('sync')
    .description('Sync configurations from team repository')
    .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
    .option('-e, --exclude-tags <tags>', 'Exclude tags (comma-separated)')
    .option('-d, --dry-run', 'Preview changes without applying')
    .option('--force-team', 'Team configs override personal')
    .option('--no-validate', 'Skip validation')
    .option('-r, --ref <ref>', 'Sync to specific ref')
    .action(async (opts: any) => {
      const command = new SyncCommand({
        tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined,
        excludeTags: opts.excludeTags
          ? opts.excludeTags.split(',').map((t: string) => t.trim())
          : undefined,
        dryRun: opts.dryRun,
        forceTeam: opts.forceTeam,
        noValidate: !opts.validate,
        ref: opts.ref,
        verbose: opts.verbose,
        quiet: opts.quiet,
        debug: opts.debug,
      });
      await command.run();
    });

  program
    .command('status')
    .description('Show sync status and check for updates')
    .action(() => {
      logger.info('status command - not yet implemented');
    });

  program
    .command('list')
    .description('List all synced configurations')
    .option('-t, --type <type>', 'Filter by type (agent/skill/mcp)')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('-n, --namespace <namespace>', 'Filter by namespace (team/personal)')
    .option('-f, --format <format>', 'Output format (table/tree/json)', 'table')
    .option('-v, --verbose', 'Verbose output')
    .action(() => {
      logger.info('list command - not yet implemented');
    });

  program
    .command('validate')
    .description('Validate configurations')
    .option('-r, --remote', 'Validate remote repository before sync')
    .option('-p, --path <path>', 'Validate specific file or directory')
    .action(() => {
      logger.info('validate command - not yet implemented');
    });

  program
    .command('update')
    .description('Update to latest version from repository')
    .option('-d, --dry-run', 'Preview changes without applying')
    .action(() => {
      logger.info('update command - not yet implemented');
    });

  program
    .command('rollback')
    .description('Rollback to previous version')
    .option('--to <ref>', 'Rollback to specific ref')
    .action(() => {
      logger.info('rollback command - not yet implemented');
    });

  program
    .command('remove')
    .description('Remove a specific configuration')
    .argument('<name>', 'Configuration name')
    .option('-t, --type <type>', 'Config type (agent/skill/mcp)')
    .action(() => {
      logger.info('remove command - not yet implemented');
    });

  program
    .command('clean')
    .description('Remove all team configurations')
    .option('-f, --force', 'Skip confirmation')
    .action(() => {
      logger.info('clean command - not yet implemented');
    });

  program
    .command('info')
    .description('Display system information')
    .action(() => {
      logger.info('info command - not yet implemented');
    });

  // Error handling
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    // Commander throws when using --help, --version, etc. - ignore these
    if (
      err instanceof Error &&
      (err.message.includes('outputHelp') || err.message.includes('(outputHelp)'))
    ) {
      // This is expected behavior, not an error
      return;
    }

    if (err instanceof OpenCodeTeamError) {
      logger.error(err.message, err);
      if (logger['config'].debug) {
        logger.debug('Error details', err.toJSON());
      }
      process.exit(1);
    } else if (err instanceof Error) {
      logger.error('An unexpected error occurred', err);
      process.exit(1);
    }
  }
}

// Run CLI
main().catch((err: Error) => {
  const logger = getLogger();
  logger.error('Fatal error', err);
  process.exit(1);
});
