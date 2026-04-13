/**
 * Blueprint generator — converts a ProjectSelection + resolved technologies
 * into a structured YAML blueprint for Claude Code skill consumption.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import yaml from 'js-yaml';
import type { ProjectSelection, Technology, TechCategory } from './types.js';

// ─── Category → Stack Slot Mapping ─────────────────────────────────

interface StackSlot {
  section: string;
  key: string;
}

const CATEGORY_STACK_MAP: Record<TechCategory, StackSlot> = {
  frontend:         { section: 'frontend',       key: 'framework' },
  css:              { section: 'frontend',       key: 'css' },
  build:            { section: 'frontend',       key: 'buildTool' },
  state:            { section: 'frontend',       key: 'stateManagement' },
  backend:          { section: 'backend',        key: 'framework' },
  database:         { section: 'database',       key: 'primary' },
  cache:            { section: 'database',       key: 'cache' },
  orm:              { section: 'database',       key: 'orm' },
  containerization: { section: 'infrastructure', key: 'containerization' },
  orchestration:    { section: 'infrastructure', key: 'orchestration' },
  cloud:            { section: 'infrastructure', key: 'cloud' },
  cicd:             { section: 'infrastructure', key: 'cicd' },
  'testing-unit':   { section: 'testing',        key: 'unit' },
  'testing-e2e':    { section: 'testing',        key: 'e2e' },
  'testing-api':    { section: 'testing',        key: 'api' },
  observability:    { section: 'monitoring',     key: 'observability' },
  logging:          { section: 'monitoring',     key: 'logging' },
  'error-tracking': { section: 'monitoring',     key: 'errorTracking' },
};

// ─── Helpers ───────────────────────────────────────────────────────

function findTech(technologies: Technology[], category: TechCategory): Technology | undefined {
  return technologies.find((t) => t.category === category);
}

function techId(technologies: Technology[], category: TechCategory): string | null {
  return findTech(technologies, category)?.id ?? null;
}

function detectLanguage(technologies: Technology[]): string {
  const frontend = findTech(technologies, 'frontend');
  const backend = findTech(technologies, 'backend');
  const primary = frontend ?? backend;
  return primary?.language ?? 'typescript';
}

function detectRuntime(technologies: Technology[]): string {
  const backend = findTech(technologies, 'backend');
  if (!backend) return 'node';
  const tags = backend.tags ?? [];
  if (tags.includes('deno')) return 'deno';
  if (tags.includes('bun')) return 'bun';
  if (tags.includes('python') || backend.language === 'python') return 'python';
  if (tags.includes('go') || backend.language === 'go') return 'go';
  if (tags.includes('rust') || backend.language === 'rust') return 'rust';
  if (tags.includes('java') || backend.language === 'java') return 'jvm';
  if (tags.includes('dotnet') || backend.language === 'csharp') return 'dotnet';
  return 'node';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Blueprint Builder ────────────────────────────────────────────

interface BlueprintStack {
  frontend: Record<string, string | null>;
  backend: Record<string, string | null>;
  database: Record<string, string | null>;
  infrastructure: Record<string, string | null>;
  testing: Record<string, string | null>;
  monitoring: Record<string, string | null>;
}

function buildStack(technologies: Technology[]): BlueprintStack {
  const lang = detectLanguage(technologies);
  const runtime = detectRuntime(technologies);

  const frontend: Record<string, string | null> = {
    framework: techId(technologies, 'frontend'),
    version: findTech(technologies, 'frontend')?.version ?? null,
    language: lang,
    css: techId(technologies, 'css'),
    buildTool: techId(technologies, 'build'),
    stateManagement: techId(technologies, 'state'),
  };

  const backend: Record<string, string | null> = {
    framework: techId(technologies, 'backend'),
    version: findTech(technologies, 'backend')?.version ?? null,
    language: findTech(technologies, 'backend')?.language ?? lang,
    runtime,
  };

  const database: Record<string, string | null> = {
    primary: techId(technologies, 'database'),
    orm: techId(technologies, 'orm'),
    cache: techId(technologies, 'cache'),
  };

  const infrastructure: Record<string, string | null> = {
    containerization: techId(technologies, 'containerization'),
    orchestration: techId(technologies, 'orchestration'),
    cicd: techId(technologies, 'cicd'),
    cloud: techId(technologies, 'cloud'),
  };

  const testing: Record<string, string | null> = {
    unit: techId(technologies, 'testing-unit'),
    e2e: techId(technologies, 'testing-e2e'),
    api: techId(technologies, 'testing-api'),
  };

  const monitoring: Record<string, string | null> = {
    observability: techId(technologies, 'observability'),
    logging: techId(technologies, 'logging'),
    errorTracking: techId(technologies, 'error-tracking'),
  };

  return { frontend, backend, database, infrastructure, testing, monitoring };
}

function buildGeneration(technologies: Technology[]): Record<string, unknown> {
  const hasDocker = technologies.some((t) => t.category === 'containerization');
  const hasOrchestration = technologies.some((t) => t.category === 'orchestration');
  const hasCicd = technologies.some((t) => t.category === 'cicd');

  return {
    sampleCrud: true,
    crudEntity: 'Item',
    crudFields: [
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'completed', type: 'boolean', default: false },
    ],
    features: ['cors', 'healthCheck', 'errorHandling', 'envConfig'],
    docker: {
      multiStage: hasDocker,
      compose: hasDocker || hasOrchestration,
    },
    ci: {
      lint: hasCicd,
      test: hasCicd,
      build: hasCicd,
      deploy: false,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Generate a YAML blueprint string from a project selection and its
 * resolved technologies.
 */
export function generateBlueprint(selection: ProjectSelection, technologies: Technology[]): string {
  const stack = buildStack(technologies);
  const generation = buildGeneration(technologies);

  // Build a versions map: techId → version for ALL selected technologies
  const versions: Record<string, string> = {};
  for (const tech of technologies) {
    if (tech.version) {
      versions[tech.id] = tech.version;
    }
  }

  const blueprint = {
    project: {
      name: selection.name,
      description: selection.description || `A ${selection.name} project`,
      outputDir: selection.outputDir,
      mode: selection.mode,
      monorepo: {
        enabled: selection.monorepo?.enabled ?? false,
        tool: selection.monorepo?.tool ?? null,
      },
    },
    stack,
    versions,
    generation,
  };

  const header = [
    '# Constellation Project Blueprint',
    `# Generated: ${today()}`,
    '# Use with: /constellation',
    '',
  ].join('\n');

  return header + yaml.dump(blueprint, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Write a blueprint YAML string to `{outputDir}/.constellation/blueprint.yml`.
 * Returns the absolute path to the written file.
 */
export async function saveBlueprintToFile(blueprint: string, outputDir: string): Promise<string> {
  const dir = join(outputDir, '.constellation');
  const filePath = join(dir, 'blueprint.yml');
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, blueprint, 'utf-8');
  return filePath;
}
