/**
 * API route handlers for the Constellation web server.
 */
import type { ServerResponse } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRegistry } from '../registry/index.js';
import { validateSelection } from '../validators/index.js';
import { runPipeline } from '../core/pipeline.js';
import type { GeneratorContext, ProjectSelection } from '../core/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helpers ──────────────────────────────────────────────────────

function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function errorResponse(res: ServerResponse, status: number, message: string): void {
  json(res, status, { error: message });
}

// ─── Handlers ─────────────────────────────────────────────────────

/**
 * GET /api/technologies — all technologies grouped by category group.
 */
export function handleGetTechnologies(res: ServerResponse): void {
  try {
    const registry = createRegistry();
    const groups = registry.getCategoryGroups();
    const allTechs = registry.getAllTechnologies();

    const result = groups.map((group) => ({
      name: group.name,
      description: group.description,
      multiSelect: group.multiSelect,
      required: group.required,
      categories: group.categories.map((cat) => ({
        id: cat,
        technologies: allTechs.filter((t) => t.category === cat),
      })),
    }));

    json(res, 200, { groups: result });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

/**
 * GET /api/categories — category groups metadata.
 */
export function handleGetCategories(res: ServerResponse): void {
  try {
    const registry = createRegistry();
    const groups = registry.getCategoryGroups();
    json(res, 200, groups);
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

/**
 * POST /api/validate — validate a technology selection.
 * Body: { technologies: string[] }
 */
export async function handleValidate(body: unknown, res: ServerResponse): Promise<void> {
  try {
    if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>).technologies)) {
      errorResponse(res, 400, 'Request body must include a "technologies" array of tech IDs.');
      return;
    }

    const techIds = (body as { technologies: string[] }).technologies;
    const registry = createRegistry();

    // Build a minimal ProjectSelection for validation
    const selection: ProjectSelection = {
      name: 'validation-check',
      outputDir: '/tmp/constellation-validate',
      mode: 'new',
      technologies: techIds.map((id) => {
        const tech = registry.getById(id);
        return { id, category: tech?.category ?? 'frontend' };
      }),
    };

    const result = await validateSelection(selection, registry);
    json(res, 200, result);
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

/**
 * POST /api/generate — generate a project from a full ProjectSelection.
 * Body: ProjectSelection
 */
export async function handleGenerate(body: unknown, res: ServerResponse): Promise<void> {
  try {
    if (!body || typeof body !== 'object') {
      errorResponse(res, 400, 'Request body must be a valid ProjectSelection object.');
      return;
    }

    const selection = body as ProjectSelection;

    // Basic validation of required fields
    if (!selection.name) {
      errorResponse(res, 400, 'Project name is required.');
      return;
    }
    if (!selection.outputDir) {
      errorResponse(res, 400, 'Output directory is required.');
      return;
    }
    if (!selection.technologies || selection.technologies.length === 0) {
      errorResponse(res, 400, 'At least one technology must be selected.');
      return;
    }

    // Set mode default
    if (!selection.mode) {
      selection.mode = 'new';
    }

    // 1. Create registry and validate
    const registry = createRegistry();
    const validation = await validateSelection(selection, registry);

    if (!validation.valid) {
      json(res, 422, {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    // 2. Resolve technologies and build context
    const selectedTechs = selection.technologies
      .map((s) => registry.getById(s.id))
      .filter((t) => t !== undefined);

    const templateDir = join(__dirname, '..', 'templates');
    const outputDir = selection.outputDir;

    const ctx: GeneratorContext = {
      selection,
      technologies: selectedTechs,
      outputDir,
      templateDir,
    };

    // 3. Create output directory
    await mkdir(outputDir, { recursive: true });

    // 4. Run the pipeline (no spinner side effects)
    const result = await runPipeline(ctx);

    // 5. Write generated files to disk
    for (const file of result.files) {
      const fullPath = join(outputDir, file.path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file.content, 'utf-8');
    }

    // 6. Return the file list and messages
    json(res, 200, {
      success: true,
      outputDir,
      files: result.files.map((f) => f.path),
      commands: (result.commands ?? []).map((c) => c.description),
      messages: result.messages ?? [],
      warnings: validation.warnings,
    });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}
