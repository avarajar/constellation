/**
 * Interactive prompts for project configuration using @inquirer/prompts.
 */
import { input, confirm, select, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import type {
  ProjectSelection,
  SelectedTech,
  TechCategoryGroup,
  Technology,
  TechRegistry,
} from '../core/types.js';
import { printSummary, CATEGORY_LABELS } from './ui.js';

/**
 * Run the full interactive prompt flow and return a ProjectSelection.
 */
export async function runInteractivePrompts(registry: TechRegistry): Promise<ProjectSelection> {
  const allTechs = registry.getAllTechnologies();
  const categoryGroups = registry.getCategoryGroups();

  // ── Project basics ──────────────────────────────────────────────────
  console.log(chalk.bold('\n  Project Setup\n'));

  const name = await input({
    message: 'Project name:',
    validate: (val) => {
      if (!val.trim()) return 'Project name is required.';
      if (!/^[a-z0-9-_]+$/i.test(val.trim())) return 'Use only letters, numbers, dashes, and underscores.';
      return true;
    },
  });

  const description = await input({
    message: 'Project description (optional):',
  });

  const outputDir = await input({
    message: 'Output directory:',
    default: `./${name}`,
  });

  // ── Mode ────────────────────────────────────────────────────────────
  const mode = await select<'new' | 'integrate'>({
    message: 'Project mode:',
    choices: [
      { name: 'New project', value: 'new', description: 'Generate a fresh project from scratch' },
      { name: 'Integrate into existing', value: 'integrate', description: 'Add to an existing codebase' },
    ],
  });

  // ── Technology selection ────────────────────────────────────────────
  console.log(chalk.bold('\n  Technology Stack\n'));

  const selectedTechs: SelectedTech[] = [];

  for (const group of categoryGroups) {
    const includeGroup = await confirm({
      message: `Include ${chalk.bold(group.name)}?`,
      default: group.required,
    });

    if (!includeGroup) continue;

    // Gather technologies for all categories in this group
    const techsInGroup: Technology[] = [];
    for (const cat of group.categories) {
      techsInGroup.push(...registry.getByCategory(cat));
    }

    if (techsInGroup.length === 0) continue;

    // Build choices grouped by subcategory
    const choices = buildGroupedChoices(techsInGroup);

    if (group.multiSelect) {
      const picked = await checkbox({
        message: `Select ${group.name} technologies:`,
        choices,
      });

      for (const id of picked) {
        const tech = allTechs.find((t) => t.id === id);
        if (tech) {
          selectedTechs.push({ id: tech.id, category: tech.category });
        }
      }
    } else {
      const picked = await select({
        message: `Select ${group.name} technology:`,
        choices: [{ name: 'Skip', value: '__skip__' }, ...choices],
      });

      if (picked !== '__skip__') {
        const tech = allTechs.find((t) => t.id === picked);
        if (tech) {
          selectedTechs.push({ id: tech.id, category: tech.category });
        }
      }
    }

    // Show running count
    if (selectedTechs.length > 0) {
      console.log(chalk.dim(`  ${selectedTechs.length} technologies selected so far.\n`));
    }
  }

  // ── Workspace tooling (only if both frontend and backend selected) ──
  const frontendCats = new Set<string>(['frontend', 'css', 'build', 'state']);
  const backendCats = new Set<string>(['backend']);
  const hasFE = selectedTechs.some((t) => frontendCats.has(t.category));
  const hasBE = selectedTechs.some((t) => backendCats.has(t.category));

  let monorepoEnabled = false;
  let monorepoTool: 'turborepo' | 'nx' | 'none' | undefined;

  if (hasFE && hasBE) {
    monorepoEnabled = await confirm({
      message: 'Add workspace tooling? (Turborepo/Nx to orchestrate frontend + backend builds)',
      default: false,
    });

    if (monorepoEnabled) {
      monorepoTool = await select<'turborepo' | 'nx' | 'none'>({
        message: 'Workspace tool:',
        choices: [
          { name: 'Turborepo', value: 'turborepo', description: 'High-performance build system by Vercel' },
          { name: 'Nx', value: 'nx', description: 'Smart, fast, extensible build system' },
          { name: 'None (manual)', value: 'none', description: 'Workspace setup without a dedicated tool' },
        ],
      });
    }
  }

  // ── Summary and confirmation ────────────────────────────────────────
  const selection: ProjectSelection = {
    name: name.trim(),
    description: description.trim() || undefined,
    outputDir,
    mode,
    monorepo: monorepoEnabled ? { enabled: true, tool: monorepoTool } : undefined,
    technologies: selectedTechs,
  };

  printSummary(selection, allTechs);

  const confirmed = await confirm({
    message: 'Proceed with generation?',
    default: true,
  });

  if (!confirmed) {
    console.log(chalk.yellow('\n  Aborted. Run the command again to start over.\n'));
    process.exit(0);
  }

  return selection;
}

/**
 * Build checkbox/select choices from technologies, with separator-style labels
 * for each subcategory.
 */
function buildGroupedChoices(
  techs: Technology[],
): Array<{ name: string; value: string; description: string }> {
  // Group by category
  const byCategory = new Map<string, Technology[]>();
  for (const tech of techs) {
    const list = byCategory.get(tech.category) ?? [];
    list.push(tech);
    byCategory.set(tech.category, list);
  }

  const choices: Array<{ name: string; value: string; description: string }> = [];

  for (const [category, catTechs] of byCategory) {
    const label = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;

    for (const tech of catTechs) {
      choices.push({
        name: `${tech.name} ${chalk.dim(`(${label})`)}`,
        value: tech.id,
        description: tech.description,
      });
    }
  }

  return choices;
}
