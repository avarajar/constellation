/**
 * API route handlers for the Constellation web server.
 */
import type { ServerResponse } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { createRegistry } from '../registry/index.js';
import { validateSelection } from '../validators/index.js';
import { runPipeline } from '../core/pipeline.js';
import { generateBlueprint, saveBlueprintToFile } from '../core/blueprint.js';
import type { GeneratorContext, ProjectSelection, TechCategory, Technology } from '../core/types.js';

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
    const outputDir = resolve(selection.outputDir);

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

    // 5b. Also save a blueprint alongside the generated files
    const blueprintYaml = generateBlueprint(selection, selectedTechs);
    const blueprintPath = await saveBlueprintToFile(blueprintYaml, outputDir);

    // 6. Return the file list and messages
    json(res, 200, {
      success: true,
      outputDir,
      blueprintPath,
      files: result.files.map((f) => f.path),
      commands: (result.commands ?? []).map((c) => c.description),
      messages: result.messages ?? [],
      warnings: validation.warnings,
    });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

// ─── Blueprint Handler ───────────────────────────────────────────

/**
 * POST /api/blueprint — generate a blueprint YAML from a ProjectSelection.
 * Returns the YAML string and the absolute path where it was saved.
 */
export async function handleCreateBlueprint(body: unknown, res: ServerResponse): Promise<void> {
  try {
    if (!body || typeof body !== 'object') {
      errorResponse(res, 400, 'Request body must be a valid ProjectSelection object.');
      return;
    }

    const rawBody = body as Record<string, unknown>;
    const selection = body as ProjectSelection;

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

    if (!selection.mode) {
      selection.mode = 'new';
    }

    // Resolve technologies from registry
    const registry = createRegistry();
    const selectedTechs = selection.technologies
      .map((s) => registry.getById(s.id))
      .filter((t): t is Technology => t !== undefined);

    // Generate blueprint YAML
    let blueprintYaml = generateBlueprint(selection, selectedTechs);

    // Append GitHub preferences if provided
    const github = rawBody.github as Record<string, unknown> | undefined;
    if (github) {
      blueprintYaml += '\ngithub:\n';
      blueprintYaml += `  mode: ${String(github.mode ?? 'none')}\n`;
      if (github.org) {
        blueprintYaml += `  org: ${String(github.org)}\n`;
      }
      if (github.repoName) {
        blueprintYaml += `  repoName: ${String(github.repoName)}\n`;
      }
      if (github.existingRepo) {
        blueprintYaml += `  existingRepo: ${String(github.existingRepo)}\n`;
      }
    }

    // Save to disk
    const outputDir = resolve(selection.outputDir);
    const blueprintPath = await saveBlueprintToFile(blueprintYaml, outputDir);

    json(res, 200, {
      success: true,
      blueprint: blueprintYaml,
      path: blueprintPath,
    });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

// ─── Home Directory Handler ──────────────────────────────────────

/**
 * GET /api/home-dir — returns the user's home directory.
 */
export function handleGetHomeDir(res: ServerResponse): void {
  json(res, 200, { homeDir: homedir() });
}

// ─── GitHub Handlers ─────────────────────────────────────────────

/**
 * GET /api/github/orgs — lists the user's GitHub username and orgs.
 * Requires the `gh` CLI to be installed and authenticated.
 */
export function handleGetGithubOrgs(res: ServerResponse): void {
  try {
    // Get the authenticated user's login
    let username = '';
    try {
      const userJson = execSync('gh api user', { encoding: 'utf-8', timeout: 10000 });
      const user = JSON.parse(userJson) as { login?: string };
      username = user.login ?? '';
    } catch {
      errorResponse(res, 500, 'GitHub CLI is not installed or not authenticated. Run `gh auth login` first.');
      return;
    }

    // Get the list of orgs
    let orgs: string[] = [];
    try {
      const orgsRaw = execSync('gh org list', { encoding: 'utf-8', timeout: 10000 }).trim();
      orgs = orgsRaw ? orgsRaw.split('\n').map((o) => o.trim()).filter(Boolean) : [];
    } catch {
      // User might not belong to any orgs — that's fine
      orgs = [];
    }

    json(res, 200, { username, orgs });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

/**
 * GET /api/github/repos?org=xxx&q=search
 * Lists repos for a given org (or personal repos if org is empty).
 */
export function handleGetGithubRepos(org: string, query: string, res: ServerResponse): void {
  try {
    const target = org || '';
    const limitFlag = '--limit 20';
    const jsonFlag = '--json name,url,description';

    let cmd: string;
    if (target) {
      cmd = `gh repo list ${target} ${jsonFlag} ${limitFlag}`;
    } else {
      cmd = `gh repo list ${jsonFlag} ${limitFlag}`;
    }

    let reposRaw: string;
    try {
      reposRaw = execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
    } catch {
      errorResponse(res, 500, 'Failed to list repositories. Ensure `gh` is installed and authenticated.');
      return;
    }

    let repos: Array<{ name: string; url: string; description: string }> = [];
    try {
      repos = JSON.parse(reposRaw) as Array<{ name: string; url: string; description: string }>;
    } catch {
      repos = [];
    }

    // Filter by query if provided
    if (query) {
      const q = query.toLowerCase();
      repos = repos.filter((r) => r.name.toLowerCase().includes(q));
    }

    json(res, 200, { repos });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}

// ─── Online Search Types ──────────────────────────────────────────

interface OnlineSearchResult {
  id: string;
  name: string;
  version: string;
  description: string;
  homepage: string;
  ecosystem: string;
}

// ─── Online Search Handler ────────────────────────────────────────

/**
 * GET /api/search-online?q=xxx&ecosystem=npm
 * Searches public package registries for technologies not in the local YAML registry.
 */
export async function handleSearchOnline(
  query: string,
  ecosystem: string,
  res: ServerResponse,
): Promise<void> {
  if (!query || !query.trim()) {
    json(res, 200, { results: [] });
    return;
  }

  const eco = (ecosystem || 'npm').toLowerCase();

  try {
    let results: OnlineSearchResult[] = [];

    switch (eco) {
      case 'npm':
        results = await searchNpm(query);
        break;
      case 'pypi':
        results = await searchPypi(query);
        break;
      case 'crates':
        results = await searchCrates(query);
        break;
      default:
        json(res, 400, { error: `Unsupported ecosystem: ${eco}`, results: [] });
        return;
    }

    json(res, 200, { results });
  } catch (err) {
    // Registry down or network error — return empty results with error message
    json(res, 200, {
      results: [],
      error: err instanceof Error ? err.message : 'Search failed',
    });
  }
}

async function searchNpm(query: string): Promise<OnlineSearchResult[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`npm registry returned ${response.status}`);

  const data = (await response.json()) as {
    objects: Array<{
      package: {
        name: string;
        version: string;
        description?: string;
        links?: { homepage?: string; npm?: string };
      };
    }>;
  };

  return (data.objects || []).map((obj) => ({
    id: obj.package.name,
    name: obj.package.name,
    version: obj.package.version || 'latest',
    description: obj.package.description || '',
    homepage:
      obj.package.links?.homepage ||
      obj.package.links?.npm ||
      `https://www.npmjs.com/package/${obj.package.name}`,
    ecosystem: 'npm',
  }));
}

async function searchPypi(query: string): Promise<OnlineSearchResult[]> {
  // PyPI doesn't have a search API with JSON; use individual package lookup
  const url = `https://pypi.org/pypi/${encodeURIComponent(query)}/json`;
  const response = await fetch(url);

  if (response.status === 404) {
    return [];
  }
  if (!response.ok) throw new Error(`PyPI returned ${response.status}`);

  const data = (await response.json()) as {
    info: {
      name: string;
      version: string;
      summary?: string;
      home_page?: string;
      project_url?: string;
      package_url?: string;
    };
  };

  return [
    {
      id: data.info.name,
      name: data.info.name,
      version: data.info.version || 'latest',
      description: data.info.summary || '',
      homepage:
        data.info.home_page ||
        data.info.package_url ||
        `https://pypi.org/project/${data.info.name}/`,
      ecosystem: 'pypi',
    },
  ];
}

async function searchCrates(query: string): Promise<OnlineSearchResult[]> {
  const url = `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=10`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'constellation-project-generator (https://github.com/constellation)' },
  });
  if (!response.ok) throw new Error(`crates.io returned ${response.status}`);

  const data = (await response.json()) as {
    crates: Array<{
      id: string;
      name: string;
      max_version: string;
      description?: string;
      homepage?: string;
      repository?: string;
    }>;
  };

  return (data.crates || []).map((crate) => ({
    id: crate.name,
    name: crate.name,
    version: crate.max_version || 'latest',
    description: crate.description || '',
    homepage:
      crate.homepage || crate.repository || `https://crates.io/crates/${crate.name}`,
    ecosystem: 'crates',
  }));
}

// ─── Add Technology Handler ───────────────────────────────────────

/**
 * POST /api/add-technology
 * Adds a technology to the runtime registry for the current session.
 */
export function handleAddTechnology(body: unknown, res: ServerResponse): void {
  try {
    if (!body || typeof body !== 'object') {
      errorResponse(res, 400, 'Request body must be a technology object.');
      return;
    }

    const input = body as Record<string, unknown>;

    if (!input.id || typeof input.id !== 'string') {
      errorResponse(res, 400, 'Technology "id" is required.');
      return;
    }

    const category = (input.category as TechCategory) || 'backend';

    const tech: Technology = {
      id: input.id as string,
      name: (input.name as string) || input.id as string,
      category,
      description: (input.description as string) || '',
      version: (input.version as string) || 'latest',
      homepage: (input.homepage as string) || undefined,
      tags: ['custom', (input.ecosystem as string) || 'npm'],
    };

    const registry = createRegistry();
    registry.addTechnology(tech);

    json(res, 200, { success: true, technology: tech });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}
