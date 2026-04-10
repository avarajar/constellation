/**
 * Generation pipeline that orchestrates step-by-step project generation.
 */
import { join } from 'node:path';
import type {
  GeneratorContext,
  GeneratorResult,
  PostGenCommand,
  PipelineHook,
  PipelineStep,
  TechCategory,
} from './types.js';
import { runGenerators } from '../generators/index.js';

/** Category groups that map pipeline steps to tech categories. */
const STEP_CATEGORIES: Record<string, TechCategory[]> = {
  'generate-frontend': ['frontend', 'css', 'build', 'state'],
  'generate-backend': ['backend', 'orm'],
  'generate-database': ['database', 'cache'],
  'generate-infra': ['containerization', 'orchestration', 'cloud', 'cicd'],
  'generate-testing': ['testing-unit', 'testing-e2e', 'testing-api'],
  'generate-monitoring': ['observability', 'logging', 'error-tracking'],
};

const PRE_GENERATE_HOOK = '.constellation/hooks/pre-generate.sh';
const POST_GENERATE_HOOK = '.constellation/hooks/post-generate.sh';

function emit(hook: PipelineHook | undefined, step: PipelineStep, status: 'start' | 'complete' | 'error', message?: string): void {
  hook?.({ step, status, message });
}

function hasTechsInCategories(ctx: GeneratorContext, categories: TechCategory[]): boolean {
  return ctx.selection.technologies.some((t) => categories.includes(t.category));
}

function mergeResults(results: GeneratorResult[]): GeneratorResult {
  return {
    files: results.flatMap((r) => r.files),
    commands: results.flatMap((r) => r.commands ?? []),
    messages: results.flatMap((r) => r.messages ?? []),
  };
}

/**
 * Run the full generation pipeline.
 */
export async function runPipeline(
  ctx: GeneratorContext,
  hooks?: PipelineHook,
): Promise<GeneratorResult> {
  const results: GeneratorResult[] = [];
  const hookCommands: PostGenCommand[] = [];

  // 1. Validate
  emit(hooks, 'validate', 'start', 'Validating configuration');
  try {
    if (!ctx.selection.name) throw new Error('Project name is required.');
    if (ctx.selection.technologies.length === 0) throw new Error('At least one technology must be selected.');
    emit(hooks, 'validate', 'complete');
  } catch (err) {
    emit(hooks, 'validate', 'error', (err as Error).message);
    throw err;
  }

  // 2. Prepare — also check for pre-generate hook
  emit(hooks, 'prepare', 'start', 'Preparing output directory');
  try {
    const preHookPath = join(ctx.outputDir, PRE_GENERATE_HOOK);
    hookCommands.push({
      command: `[ -f "${preHookPath}" ] && bash "${preHookPath}" || true`,
      cwd: ctx.outputDir,
      description: 'Run pre-generate hook if it exists',
    });
    emit(hooks, 'prepare', 'complete');
  } catch (err) {
    emit(hooks, 'prepare', 'error', (err as Error).message);
    throw err;
  }

  // 3. Common files (always runs)
  emit(hooks, 'generate-common', 'start', 'Generating common files');
  try {
    const commonResult = await runGenerators(ctx, 'common');
    results.push(commonResult);
    emit(hooks, 'generate-common', 'complete');
  } catch (err) {
    emit(hooks, 'generate-common', 'error', (err as Error).message);
    throw err;
  }

  // 4-9. Category-based generation steps
  const categorySteps: Array<{ step: PipelineStep; key: string }> = [
    { step: 'generate-frontend', key: 'generate-frontend' },
    { step: 'generate-backend', key: 'generate-backend' },
    { step: 'generate-database', key: 'generate-database' },
    { step: 'generate-infra', key: 'generate-infra' },
    { step: 'generate-testing', key: 'generate-testing' },
    { step: 'generate-monitoring', key: 'generate-monitoring' },
  ];

  for (const { step, key } of categorySteps) {
    const categories = STEP_CATEGORIES[key];
    if (!categories || !hasTechsInCategories(ctx, categories)) continue;

    emit(hooks, step, 'start', `Generating ${step.replace('generate-', '')} files`);
    try {
      const stepResult = await runGenerators(ctx, key.replace('generate-', ''));
      results.push(stepResult);
      emit(hooks, step, 'complete');
    } catch (err) {
      emit(hooks, step, 'error', (err as Error).message);
      throw err;
    }
  }

  // 10. Finalize — also add post-generate hook command
  emit(hooks, 'finalize', 'start', 'Finalizing generation');
  const merged = mergeResults(results);

  const postHookPath = join(ctx.outputDir, POST_GENERATE_HOOK);
  hookCommands.push({
    command: `[ -f "${postHookPath}" ] && bash "${postHookPath}" || true`,
    cwd: ctx.outputDir,
    description: 'Run post-generate hook if it exists',
  });

  merged.commands = [...hookCommands, ...(merged.commands ?? [])];

  emit(hooks, 'finalize', 'complete', `Generated ${merged.files.length} files`);

  return merged;
}
