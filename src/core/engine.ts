/**
 * Main generation engine that orchestrates the full project generation flow.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { createRegistry } from '../registry/index.js';
import { validateSelection } from '../validators/index.js';
import { runPipeline } from './pipeline.js';
import { createSpinner, printSuccess, printError } from '../cli/ui.js';
import type { GeneratorContext, ProjectSelection, PipelineStep } from './types.js';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Create the generation engine.
 */
export function createEngine() {
  return {
    async generate(selection: ProjectSelection): Promise<void> {
      const spinner = createSpinner('Starting generation...');
      spinner.start();

      try {
        // 1. Create registry and resolve technologies
        const registry = createRegistry();
        const allTechs = registry.getAllTechnologies();
        const selectedTechs = selection.technologies
          .map((s) => registry.getById(s.id))
          .filter((t) => t !== undefined);

        // 2. Validate selection
        spinner.text = 'Validating selection...';
        const validation = await validateSelection(selection, registry);

        if (!validation.valid) {
          spinner.fail('Validation failed.');
          for (const error of validation.errors) {
            printError(error);
          }
          throw new Error('Selection validation failed. See errors above.');
        }

        if (validation.warnings.length > 0) {
          for (const warning of validation.warnings) {
            spinner.warn(warning);
            spinner.start();
          }
        }

        // 3. Build GeneratorContext
        const templateDir = join(__dirname, '..', 'templates');
        const outputDir = selection.outputDir;

        const ctx: GeneratorContext = {
          selection,
          technologies: selectedTechs,
          outputDir,
          templateDir,
        };

        // 4. Create output directory
        spinner.text = 'Creating output directory...';
        await mkdir(outputDir, { recursive: true });

        // 5. Run pipeline with spinner updates
        const result = await runPipeline(ctx, (event) => {
          if (event.status === 'start' && event.message) {
            spinner.text = event.message;
          }
        });

        // 6. Write generated files to disk
        spinner.text = `Writing ${result.files.length} files...`;

        for (const file of result.files) {
          const fullPath = join(outputDir, file.path);
          await mkdir(dirname(fullPath), { recursive: true });
          await writeFile(fullPath, file.content, 'utf-8');
        }

        // 7. Run post-generation commands
        if (result.commands && result.commands.length > 0) {
          for (const cmd of result.commands) {
            spinner.text = cmd.description;
            try {
              execSync(cmd.command, {
                cwd: cmd.cwd ?? outputDir,
                stdio: 'pipe',
              });
            } catch {
              // Non-fatal: warn but continue
              spinner.warn(`Command failed: ${cmd.command}`);
              spinner.start();
            }
          }
        }

        // 8. Print messages from generators
        if (result.messages && result.messages.length > 0) {
          for (const msg of result.messages) {
            console.log(`  ${msg}`);
          }
        }

        spinner.succeed(`Generated ${result.files.length} files.`);
        printSuccess(outputDir);
      } catch (err) {
        spinner.fail('Generation failed.');
        if (!(err instanceof Error && err.message.includes('validation failed'))) {
          printError(err instanceof Error ? err.message : String(err));
        }
        throw err;
      }
    },
  };
}
