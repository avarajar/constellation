import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml';
import type {
  CompatibilityRule,
  ProjectSelection,
  TechRegistry,
  ValidationResult,
} from '../core/types.js';

// ─── YAML Shape ────────────────────────────────────────────────────

interface RulesFile {
  rules: CompatibilityRule[];
}

// ─── Loader ────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_PATH = path.join(__dirname, 'rules.yml');

function loadRules(): CompatibilityRule[] {
  const content = readFileSync(RULES_PATH, 'utf-8');
  const parsed = yaml.load(content) as RulesFile;
  return parsed?.rules ?? [];
}

// ─── Rule Evaluation ───────────────────────────────────────────────

/**
 * Check whether a tech ID expression is satisfied by the current selection.
 * An expression can be a single id ("react") or a pipe-separated disjunction
 * ("express|fastify|nestjs|hono|elysia|nextjs"), meaning at least one must
 * be present.
 */
function selectionHas(selectedIds: Set<string>, expr: string): boolean {
  const alternatives = expr.split('|');
  return alternatives.some((id) => selectedIds.has(id));
}

function evaluateRule(
  rule: CompatibilityRule,
  selectedIds: Set<string>,
): { type: 'error' | 'warning'; message: string } | null {
  switch (rule.type) {
    case 'conflict': {
      // All listed techs must be present for the conflict to trigger.
      const allPresent = rule.techs.every((expr) =>
        selectionHas(selectedIds, expr),
      );
      if (allPresent) {
        return { type: 'error', message: rule.message };
      }
      return null;
    }

    case 'requires': {
      // First tech is the one that has the requirement; second is what it needs.
      // Only fires if the first is present but the second is not.
      const [subject, dependency] = rule.techs;
      if (
        selectionHas(selectedIds, subject) &&
        !selectionHas(selectedIds, dependency)
      ) {
        return { type: 'error', message: rule.message };
      }
      return null;
    }

    case 'warns': {
      // Warning triggers when every listed tech is present.
      const allPresent = rule.techs.every((expr) =>
        selectionHas(selectedIds, expr),
      );
      if (allPresent) {
        return { type: 'warning', message: rule.message };
      }
      return null;
    }

    default:
      return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────

export async function validateSelection(
  selection: ProjectSelection,
  _registry: TechRegistry,
): Promise<ValidationResult> {
  const rules = loadRules();
  const selectedIds = new Set(selection.technologies.map((t) => t.id));

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, selectedIds);
    if (!result) continue;

    if (result.type === 'error') {
      errors.push(result.message);
    } else {
      warnings.push(result.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
