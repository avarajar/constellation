import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml';
import type {
  Technology,
  TechCategory,
  TechCategoryGroup,
  TechRegistry,
} from '../core/types.js';

// ─── Category Groups ───────────────────────────────────────────────

export const CATEGORY_GROUPS: TechCategoryGroup[] = [
  {
    name: 'Frontend',
    description: 'UI frameworks, CSS solutions, build tools, and state management',
    categories: ['frontend', 'css', 'build', 'state'],
    multiSelect: true,
    required: true,
  },
  {
    name: 'Backend',
    description: 'Server-side frameworks and runtimes',
    categories: ['backend'],
    multiSelect: false,
    required: true,
  },
  {
    name: 'Database',
    description: 'Databases, caches, and ORMs',
    categories: ['database', 'cache', 'orm'],
    multiSelect: true,
    required: false,
  },
  {
    name: 'Infrastructure',
    description: 'Containers, orchestration, cloud platforms, and CI/CD',
    categories: ['containerization', 'orchestration', 'cloud', 'cicd'],
    multiSelect: true,
    required: false,
  },
  {
    name: 'Testing',
    description: 'Unit, end-to-end, and API testing tools',
    categories: ['testing-unit', 'testing-e2e', 'testing-api'],
    multiSelect: true,
    required: false,
  },
  {
    name: 'Monitoring',
    description: 'Observability, logging, and error tracking',
    categories: ['observability', 'logging', 'error-tracking'],
    multiSelect: true,
    required: false,
  },
];

// ─── YAML Shape ────────────────────────────────────────────────────

interface TechFile {
  technologies: Technology[];
}

// ─── Helpers ───────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TECH_DIR = path.join(__dirname, 'technologies');

function loadAllTechnologies(): Technology[] {
  const files = readdirSync(TECH_DIR).filter((f) => f.endsWith('.yml'));
  const technologies: Technology[] = [];

  for (const file of files) {
    const content = readFileSync(path.join(TECH_DIR, file), 'utf-8');
    const parsed = yaml.load(content) as TechFile;
    if (parsed?.technologies) {
      technologies.push(...parsed.technologies);
    }
  }

  return technologies;
}

/**
 * Simple fuzzy-match scorer. Returns a positive number if the query tokens
 * appear (in order) inside the haystack, 0 otherwise. Higher = better match.
 */
function fuzzyScore(query: string, haystack: string): number {
  const q = query.toLowerCase();
  const h = haystack.toLowerCase();

  // Exact substring match gets the highest score.
  if (h.includes(q)) return 100;

  // Token-based: every query token must appear somewhere in the haystack.
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  let matched = 0;
  for (const token of tokens) {
    if (h.includes(token)) matched++;
  }

  if (matched === tokens.length) return 80;
  if (matched > 0) return (matched / tokens.length) * 60;

  // Word-boundary prefix match: query matches the start of any word in haystack.
  const words = h.split(/[\s\-_.,/]+/);
  for (const word of words) {
    if (word.startsWith(q)) return 50;
  }

  return 0;
}

// ─── Registry Implementation ───────────────────────────────────────

class Registry implements TechRegistry {
  private technologies: Technology[];

  constructor(technologies: Technology[]) {
    this.technologies = technologies;
  }

  getAllTechnologies(): Technology[] {
    return this.technologies;
  }

  getByCategory(category: TechCategory): Technology[] {
    return this.technologies.filter((t) => t.category === category);
  }

  getById(id: string): Technology | undefined {
    return this.technologies.find((t) => t.id === id);
  }

  search(query: string): Technology[] {
    if (!query.trim()) return [];

    const scored = this.technologies
      .map((tech) => {
        const fields = [
          tech.id,
          tech.name,
          tech.description,
          ...(tech.tags ?? []),
        ].join(' ');
        return { tech, score: fuzzyScore(query, fields) };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((entry) => entry.tech);
  }

  getCategoryGroups(): TechCategoryGroup[] {
    return CATEGORY_GROUPS;
  }
}

// ─── Factory ───────────────────────────────────────────────────────

export function createRegistry(): TechRegistry {
  const technologies = loadAllTechnologies();
  return new Registry(technologies);
}
