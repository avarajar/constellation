import { describe, it, expect } from 'vitest';
import { createRegistry } from '../src/registry/index.js';
import { createFrontendGenerator } from '../src/generators/frontend.js';
import { createBackendGenerator } from '../src/generators/backend.js';
import { createCommonGenerator } from '../src/generators/common.js';
import { createInfrastructureGenerator } from '../src/generators/infrastructure.js';
import type { GeneratorContext, TechRegistry } from '../src/core/types.js';

describe('Generators', () => {
  let registry: TechRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  const makeCtx = (techIds: string[]): GeneratorContext => ({
    selection: {
      name: 'test-project',
      outputDir: '/tmp/test',
      mode: 'new',
      technologies: techIds.map((id) => ({
        id,
        category: registry.getById(id)!.category,
      })),
    },
    technologies: techIds.map((id) => registry.getById(id)!),
    outputDir: '/tmp/test',
    templateDir: '',
  });

  describe('Frontend generator', () => {
    it('produces files when React is selected', async () => {
      const generator = createFrontendGenerator();
      const result = await generator.generate(makeCtx(['react']));
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.path.includes('package.json'))).toBe(true);
      expect(result.files.some((f) => f.path.includes('App.tsx'))).toBe(true);
    });

    it('produces files when Vue is selected', async () => {
      const generator = createFrontendGenerator();
      const result = await generator.generate(makeCtx(['vue']));
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.path.includes('App.vue'))).toBe(true);
    });

    it('produces no files when no frontend tech is selected', async () => {
      const generator = createFrontendGenerator();
      const result = await generator.generate(makeCtx(['fastify']));
      expect(result.files).toHaveLength(0);
    });
  });

  describe('Backend generator', () => {
    it('produces files when Fastify is selected', async () => {
      const generator = createBackendGenerator();
      const result = await generator.generate(makeCtx(['fastify']));
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.path.includes('package.json'))).toBe(true);
      expect(result.files.some((f) => f.path.includes('routes/items'))).toBe(true);
    });

    it('produces files when Express is selected', async () => {
      const generator = createBackendGenerator();
      const result = await generator.generate(makeCtx(['express']));
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.path.includes('index.ts'))).toBe(true);
    });

    it('produces Python files when FastAPI is selected', async () => {
      const generator = createBackendGenerator();
      const result = await generator.generate(makeCtx(['fastapi']));
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.path.includes('requirements.txt'))).toBe(true);
      expect(result.files.some((f) => f.path.includes('main.py'))).toBe(true);
    });

    it('produces no files when no backend tech is selected', async () => {
      const generator = createBackendGenerator();
      const result = await generator.generate(makeCtx(['react']));
      expect(result.files).toHaveLength(0);
    });
  });

  describe('Common generator', () => {
    it('always produces README, .gitignore, and .env.example', async () => {
      const generator = createCommonGenerator();
      const result = await generator.generate(makeCtx(['react', 'fastify']));
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain('README.md');
      expect(paths).toContain('.gitignore');
      expect(paths).toContain('.env.example');
    });

    it('produces a Makefile', async () => {
      const generator = createCommonGenerator();
      const result = await generator.generate(makeCtx(['react', 'fastify']));
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain('Makefile');
    });

    it('produces setup script', async () => {
      const generator = createCommonGenerator();
      const result = await generator.generate(makeCtx(['react', 'fastify']));
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain('scripts/setup.sh');
    });

    it('produces files even with no techs selected', async () => {
      const generator = createCommonGenerator();
      const ctx: GeneratorContext = {
        selection: {
          name: 'test-project',
          outputDir: '/tmp/test',
          mode: 'new',
          technologies: [],
        },
        technologies: [],
        outputDir: '/tmp/test',
        templateDir: '',
      };
      const result = await generator.generate(ctx);
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  describe('Infrastructure generator', () => {
    it('produces Dockerfile when Docker is selected with a backend', async () => {
      const generator = createInfrastructureGenerator();
      const result = await generator.generate(makeCtx(['docker', 'fastify']));
      expect(result.files.some((f) => f.path.includes('Dockerfile'))).toBe(true);
    });

    it('produces docker-compose.yml when Docker is selected', async () => {
      const generator = createInfrastructureGenerator();
      const result = await generator.generate(makeCtx(['docker', 'fastify']));
      expect(result.files.some((f) => f.path.includes('docker-compose.yml'))).toBe(true);
    });

    it('produces GitHub Actions config when github-actions is selected', async () => {
      const generator = createInfrastructureGenerator();
      const result = await generator.generate(makeCtx(['github-actions', 'fastify']));
      expect(result.files.some((f) => f.path.includes('.github/workflows/ci.yml'))).toBe(true);
    });

    it('produces Kubernetes manifests when kubernetes is selected', async () => {
      const generator = createInfrastructureGenerator();
      const result = await generator.generate(makeCtx(['kubernetes', 'fastify']));
      expect(result.files.some((f) => f.path.includes('k8s/'))).toBe(true);
    });

    it('produces no files when no infra tech is selected', async () => {
      const generator = createInfrastructureGenerator();
      const result = await generator.generate(makeCtx(['react', 'fastify']));
      expect(result.files).toHaveLength(0);
    });
  });
});
