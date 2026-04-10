/**
 * Display and formatting helpers for the CLI.
 */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { ProjectSelection, Technology, TechCategory } from '../core/types.js';

const BANNER = `
   ██████╗ ██████╗ ███╗   ██╗███████╗████████╗███████╗██╗     ██╗      █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
  ██╔════╝██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝██╔════╝██║     ██║     ██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
  ██║     ██║   ██║██╔██╗ ██║███████╗   ██║   █████╗  ██║     ██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║
  ██║     ██║   ██║██║╚██╗██║╚════██║   ██║   ██╔══╝  ██║     ██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
  ╚██████╗╚██████╔╝██║ ╚████║███████║   ██║   ███████╗███████╗███████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
   ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
`;

const CATEGORY_LABELS: Record<TechCategory, string> = {
  frontend: 'Frontend Framework',
  css: 'CSS / Styling',
  build: 'Build Tool',
  state: 'State Management',
  backend: 'Backend Framework',
  database: 'Database',
  cache: 'Cache',
  orm: 'ORM / Query Builder',
  containerization: 'Containerization',
  orchestration: 'Orchestration',
  cloud: 'Cloud Provider',
  cicd: 'CI/CD',
  'testing-unit': 'Unit Testing',
  'testing-e2e': 'E2E Testing',
  'testing-api': 'API Testing',
  observability: 'Observability',
  logging: 'Logging',
  'error-tracking': 'Error Tracking',
};

export function banner(): void {
  console.log(chalk.cyan(BANNER));
  console.log(chalk.dim('  Generate fully configured projects with your preferred tech stack.\n'));
}

export function printSummary(selection: ProjectSelection, technologies: Technology[]): void {
  const techMap = new Map(technologies.map((t) => [t.id, t]));

  console.log();
  console.log(chalk.bold.underline('Project Summary'));
  console.log();
  console.log(`  ${chalk.bold('Name:')}         ${selection.name}`);
  if (selection.description) {
    console.log(`  ${chalk.bold('Description:')}  ${selection.description}`);
  }
  console.log(`  ${chalk.bold('Output:')}       ${selection.outputDir}`);
  console.log(`  ${chalk.bold('Mode:')}         ${selection.mode === 'new' ? 'New project' : 'Integrate into existing'}`);

  if (selection.monorepo?.enabled) {
    console.log(`  ${chalk.bold('Monorepo:')}     ${selection.monorepo.tool ?? 'none'}`);
  }

  console.log();
  console.log(chalk.bold('  Technologies:'));

  // Group selected techs by category
  const grouped = new Map<TechCategory, Technology[]>();
  for (const sel of selection.technologies) {
    const tech = techMap.get(sel.id);
    if (!tech) continue;
    const list = grouped.get(sel.category) ?? [];
    list.push(tech);
    grouped.set(sel.category, list);
  }

  for (const [category, techs] of grouped) {
    const label = CATEGORY_LABELS[category] ?? category;
    const names = techs.map((t) => chalk.green(t.name)).join(', ');
    console.log(`    ${chalk.dim(label + ':')} ${names}`);
  }

  console.log();
  console.log(chalk.dim(`  Total: ${selection.technologies.length} technologies selected`));
  console.log();
}

export function printSuccess(outputDir: string): void {
  console.log();
  console.log(chalk.green.bold('  ✔ Project generated successfully!'));
  console.log();
  console.log(chalk.bold('  Next steps:'));
  console.log(`    ${chalk.cyan('cd')} ${outputDir}`);
  console.log(`    ${chalk.cyan('npm install')}`);
  console.log(`    ${chalk.cyan('npm run dev')}`);
  console.log();
}

export function printError(message: string): void {
  console.error();
  console.error(chalk.red.bold('  ✖ Error: ') + message);
  console.error();
}

export function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' });
}

export { CATEGORY_LABELS };
