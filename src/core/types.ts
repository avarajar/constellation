/**
 * Core types for Constellation project generator.
 */

// ─── Technology Registry ────────────────────────────────────────────

export type TechCategory =
  | 'frontend'
  | 'css'
  | 'build'
  | 'state'
  | 'backend'
  | 'database'
  | 'cache'
  | 'orm'
  | 'containerization'
  | 'orchestration'
  | 'cloud'
  | 'cicd'
  | 'testing-unit'
  | 'testing-e2e'
  | 'testing-api'
  | 'observability'
  | 'logging'
  | 'error-tracking';

export interface Technology {
  id: string;
  name: string;
  category: TechCategory;
  description: string;
  language?: string;
  requires?: string[];
  conflicts?: string[];
  tags?: string[];
  version?: string;
  package?: string;
  ecosystem?: string;
  homepage?: string;
}

export interface TechCategoryGroup {
  name: string;
  description: string;
  categories: TechCategory[];
  multiSelect: boolean;
  required: boolean;
}

// ─── Compatibility ──────────────────────────────────────────────────

export interface CompatibilityRule {
  id: string;
  type: 'conflict' | 'requires' | 'warns';
  techs: string[];
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Project Selection ──────────────────────────────────────────────

export interface ProjectSelection {
  name: string;
  description?: string;
  outputDir: string;
  mode: 'new' | 'integrate';
  monorepo?: {
    enabled: boolean;
    tool?: 'turborepo' | 'nx' | 'none';
  };
  options?: {
    frontendPkgManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
    backendPkgManager?: 'pip' | 'uv' | 'poetry' | 'pipenv' | 'npm' | 'yarn' | 'pnpm' | 'bun';
    cloudDeployModel?: string;
    frontendLinter?: 'eslint' | 'biome';
    backendLinter?: 'ruff' | 'flake8' | 'eslint' | 'biome' | 'golangci-lint' | 'clippy';
    security?: boolean;
  };
  technologies: SelectedTech[];
}

export interface SelectedTech {
  id: string;
  category: TechCategory;
}

// ─── Generation ─────────────────────────────────────────────────────

export interface GeneratorContext {
  selection: ProjectSelection;
  technologies: Technology[];
  outputDir: string;
  templateDir: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  overwrite?: boolean;
}

export interface GeneratorResult {
  files: GeneratedFile[];
  commands?: PostGenCommand[];
  messages?: string[];
}

export interface PostGenCommand {
  command: string;
  cwd?: string;
  description: string;
}

// ─── Generator Interface ────────────────────────────────────────────

export interface Generator {
  name: string;
  description: string;
  generate(ctx: GeneratorContext): Promise<GeneratorResult>;
}

// ─── Pipeline ───────────────────────────────────────────────────────

export type PipelineStep =
  | 'validate'
  | 'prepare'
  | 'generate-frontend'
  | 'generate-backend'
  | 'generate-database'
  | 'generate-infra'
  | 'generate-testing'
  | 'generate-monitoring'
  | 'generate-common'
  | 'finalize';

export interface PipelineEvent {
  step: PipelineStep;
  status: 'start' | 'complete' | 'error';
  message?: string;
}

export type PipelineHook = (event: PipelineEvent) => void;

// ─── Registry ───────────────────────────────────────────────────────

export interface TechRegistry {
  getAllTechnologies(): Technology[];
  getByCategory(category: TechCategory): Technology[];
  getById(id: string): Technology | undefined;
  search(query: string): Technology[];
  getCategoryGroups(): TechCategoryGroup[];
  addTechnology(tech: Technology): void;
  enrichWithVersions(): Promise<void>;
}

// ─── Template ───────────────────────────────────────────────────────

export interface TemplateEngine {
  render(templatePath: string, data: Record<string, unknown>): Promise<string>;
  renderString(template: string, data: Record<string, unknown>): string;
}
