/**
 * CLI command definitions for Constellation.
 */
import type { Command } from 'commander';
import chalk from 'chalk';
import { createRegistry } from '../registry/index.js';
import { runInteractivePrompts } from './prompts.js';
import { banner, printError, printSummary, CATEGORY_LABELS } from './ui.js';
import { createEngine } from '../core/engine.js';
import { validateSelection } from '../validators/index.js';
import { readFile } from 'node:fs/promises';
import type { ProjectSelection } from '../core/types.js';

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
