/**
 * Generator registry. Exports all generators and orchestration functions.
 */
import type { Generator, GeneratorContext, GeneratorResult } from '../core/types.js';
import { createFrontendGenerator } from './frontend.js';
import { createBackendGenerator } from './backend.js';
import { createDatabaseGenerator } from './database.js';
import { createInfrastructureGenerator } from './infrastructure.js';
import { createTestingGenerator } from './testing.js';
import { createMonitoringGenerator } from './monitoring.js';
import { createCommonGenerator } from './common.js';

/**
 * Map of group names to generator factory functions.
 * Used by the pipeline to run generators for a specific step.
 */
const GROUP_FACTORIES: Record<string, Array<() => Generator>> = {
  common: [createCommonGenerator],
  frontend: [createFrontendGenerator],
  backend: [createBackendGenerator],
  database: [createDatabaseGenerator],
  infra: [createInfrastructureGenerator],
  testing: [createTestingGenerator],
  monitoring: [createMonitoringGenerator],
};

/**
 * Returns all available generators in execution order.
 */
export function getGenerators(): Generator[] {
  return [
    createFrontendGenerator(),
    createBackendGenerator(),
    createDatabaseGenerator(),
    createInfrastructureGenerator(),
    createTestingGenerator(),
    createMonitoringGenerator(),
    createCommonGenerator(),
  ];
}

function mergeResults(results: GeneratorResult[]): GeneratorResult {
  return {
    files: results.flatMap((r) => r.files),
    commands: results.flatMap((r) => r.commands ?? []),
    messages: results.flatMap((r) => r.messages ?? []),
  };
}

/**
 * Runs generators and merges their results.
 * When called with a group name, only runs generators in that group (used by the pipeline).
 * When called without a group, runs all generators.
 */
export async function runGenerators(ctx: GeneratorContext, group?: string): Promise<GeneratorResult> {
  const factories = group
    ? GROUP_FACTORIES[group] ?? []
    : Object.values(GROUP_FACTORIES).flat();

  const results: GeneratorResult[] = [];

  for (const factory of factories) {
    const generator = factory();
    const result = await generator.generate(ctx);
    results.push(result);
  }

  return mergeResults(results);
}

export {
  createFrontendGenerator,
  createBackendGenerator,
  createDatabaseGenerator,
  createInfrastructureGenerator,
  createTestingGenerator,
  createMonitoringGenerator,
  createCommonGenerator,
};
