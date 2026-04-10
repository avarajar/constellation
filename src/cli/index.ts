/**
 * CLI command definitions for Constellation.
 */
import type { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'node:child_process';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';
import { createRegistry } from '../registry/index.js';
import { runInteractivePrompts } from './prompts.js';
import { banner, printError, printSummary, CATEGORY_LABELS } from './ui.js';
import { createEngine } from '../core/engine.js';
import { validateSelection } from '../validators/index.js';
import type { ProjectSelection } from '../core/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Open a URL in the default browser (cross-platform).
 */
function openBrowser(url: string): void {
  const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${url}`);
}

/**
 * Register the "new" command for creating a project.
 */
export function registerNewCommand(program: Command): void {
  program
    .command('new')
    .description('Create a new project with an interactive tech stack selector')
    .option('-n, --name <name>', 'Project name (skips the name prompt)')
    .action(async (opts: { name?: string }) => {
      try {
        banner();

        const registry = createRegistry();
        const selection = await runInteractivePrompts(registry);

        // Override name if provided via flag
        if (opts.name) {
          selection.name = opts.name;
        }

        const engine = createEngine();
        await engine.generate(selection);
      } catch (err) {
        if ((err as { name?: string }).name === 'ExitPromptError') {
          // User pressed Ctrl+C during prompts
          console.log(chalk.yellow('\n  Aborted.\n'));
          process.exit(0);
        }
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Register the "list" command for showing available technologies.
 */
export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List all available technologies')
    .option('-c, --category <category>', 'Filter by category')
    .action(async (opts: { category?: string }) => {
      try {
        const registry = createRegistry();
        const groups = registry.getCategoryGroups();

        console.log(chalk.bold('\n  Available Technologies\n'));

        for (const group of groups) {
          if (opts.category && !group.categories.some((c) => c.includes(opts.category!))) {
            continue;
          }

          console.log(chalk.bold.cyan(`  ${group.name}`));
          console.log(chalk.dim(`  ${group.description}\n`));

          for (const cat of group.categories) {
            const techs = registry.getByCategory(cat);
            if (techs.length === 0) continue;

            const label = CATEGORY_LABELS[cat] ?? cat;
            console.log(chalk.bold(`    ${label}:`));

            for (const tech of techs) {
              console.log(
                `      ${chalk.green(tech.name)} ${chalk.dim(`v${tech.version}`)} — ${tech.description}`,
              );
            }
            console.log();
          }
        }
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Register the "web" command for starting the web UI.
 */
export function registerWebCommand(program: Command): void {
  program
    .command('web')
    .description('Start the web UI for interactive project generation')
    .option('-p, --port <port>', 'Port number', '3210')
    .option('-w, --wait', 'Block until a blueprint is saved, then exit (used by Claude Code)')
    .action(async (opts: { port: string; wait?: boolean }) => {
      const port = parseInt(opts.port, 10);

      if (opts.wait) {
        const { startServerAndWait } = await import('../web/server.js');
        console.log(chalk.dim('  Opening browser...'));
        setTimeout(() => openBrowser(`http://localhost:${port}`), 1000);
        const blueprintPath = await startServerAndWait(port);
        // Final output line — Claude Code parses this
        console.log(blueprintPath);
        process.exit(0);
      } else {
        const { startServer } = await import('../web/server.js');
        startServer(port);
      }
    });
}

/**
 * Register the "validate" command for checking a config file.
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate <config>')
    .description('Validate a project configuration file')
    .action(async (configPath: string) => {
      try {
        const raw = await readFile(configPath, 'utf-8');
        const selection: ProjectSelection = JSON.parse(raw);

        const registry = createRegistry();
        const result = await validateSelection(selection, registry);

        if (result.valid) {
          console.log(chalk.green.bold('\n  ✔ Configuration is valid.\n'));
          printSummary(selection, registry.getAllTechnologies());
        } else {
          console.log(chalk.red.bold('\n  ✖ Configuration has errors:\n'));
          for (const error of result.errors) {
            console.log(chalk.red(`    • ${error}`));
          }
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow.bold('\n  Warnings:\n'));
          for (const warning of result.warnings) {
            console.log(chalk.yellow(`    • ${warning}`));
          }
        }

        console.log();
        process.exit(result.valid ? 0 : 1);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Register the "install" command for setting up the Claude Code skill globally.
 */
export function registerInstallCommand(program: Command): void {
  program
    .command('install')
    .description('Install the /constellation skill for Claude Code (copies to ~/.claude/commands/)')
    .action(async () => {
      try {
        const skillSource = join(__dirname, '..', '..', 'commands', 'constellation.md');
        const destDir = join(homedir(), '.claude', 'commands');
        const destFile = join(destDir, 'constellation.md');

        await mkdir(destDir, { recursive: true });

        let skillContent: string;
        try {
          skillContent = await readFile(skillSource, 'utf-8');
        } catch {
          // Fallback: try the .claude/commands path (development mode)
          const devSource = join(__dirname, '..', '..', '.claude', 'commands', 'constellation.md');
          skillContent = await readFile(devSource, 'utf-8');
        }

        await writeFile(destFile, skillContent, 'utf-8');

        console.log();
        console.log(chalk.bold('  Constellation — Claude Code Skill Installed'));
        console.log(chalk.dim('  ──────────────────────────────────────────'));
        console.log(`  ${chalk.green('✔')} Copied to ${chalk.cyan(destFile)}`);
        console.log();
        console.log(`  Run ${chalk.cyan('/constellation')} in Claude Code to get started.`);
        console.log();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

/**
 * Register the default action (no subcommand = interactive web flow).
 */
export function registerDefaultAction(program: Command): void {
  program.action(async () => {
    // If no subcommand given, run the interactive web flow (same as `web --wait`)
    const port = 3210;
    const { startServerAndWait } = await import('../web/server.js');
    console.log(chalk.dim('  Opening browser...'));
    setTimeout(() => openBrowser(`http://localhost:${port}`), 1000);
    const blueprintPath = await startServerAndWait(port);
    console.log(blueprintPath);
    process.exit(0);
  });
}
