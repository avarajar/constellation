import { describe, it, expect } from 'vitest';
import { validateSelection } from '../src/validators/index.js';
import { createRegistry } from '../src/registry/index.js';
import type { ProjectSelection, TechRegistry } from '../src/core/types.js';

describe('Validators', () => {
  let registry: TechRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  const makeSelection = (techIds: string[]): ProjectSelection => ({
    name: 'test-project',
    outputDir: '/tmp/test',
    mode: 'new',
    technologies: techIds.map((id) => ({
      id,
      category: registry.getById(id)!.category,
    })),
  });

  describe('valid selections', () => {
    it('passes validation for a compatible selection', async () => {
      const selection = makeSelection(['react', 'fastify', 'postgresql']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes validation for a single technology', async () => {
      const selection = makeSelection(['react']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('conflict rules', () => {
    it('produces an error when React and Angular are both selected', async () => {
      const selection = makeSelection(['react', 'angular']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('React') && e.includes('Angular'))).toBe(true);
    });

    it('produces an error when React and Vue are both selected', async () => {
      const selection = makeSelection(['react', 'vue']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('React') && e.includes('Vue'))).toBe(true);
    });

    it('produces an error when Vite and Webpack are both selected', async () => {
      const selection = makeSelection(['vite', 'webpack']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Vite') && e.includes('Webpack'))).toBe(true);
    });

    it('produces an error when Docker and Podman are both selected', async () => {
      const selection = makeSelection(['docker', 'podman']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Docker') && e.includes('Podman'))).toBe(true);
    });
  });

  describe('requirement rules', () => {
    it('produces an error when Nuxt is selected without Vue', async () => {
      const selection = makeSelection(['nuxt']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Nuxt') && e.includes('Vue'))).toBe(true);
    });

    it('produces an error when Next.js is selected without React', async () => {
      const selection = makeSelection(['nextjs']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Next.js') && e.includes('React'))).toBe(true);
    });

    it('passes when Nuxt is selected with Vue', async () => {
      const selection = makeSelection(['nuxt', 'vue']);
      const result = await validateSelection(selection, registry);
      const nuxtErrors = result.errors.filter((e) => e.includes('Nuxt'));
      expect(nuxtErrors).toHaveLength(0);
    });

    it('produces an error when Pinia is selected without Vue', async () => {
      const selection = makeSelection(['pinia']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Pinia') && e.includes('Vue'))).toBe(true);
    });

    it('produces an error when Zustand is selected without React', async () => {
      const selection = makeSelection(['zustand']);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Zustand') && e.includes('React'))).toBe(true);
    });
  });

  describe('warning rules', () => {
    it('produces a warning for Kubernetes', async () => {
      const selection = makeSelection(['kubernetes']);
      const result = await validateSelection(selection, registry);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Kubernetes'))).toBe(true);
    });

    it('warnings do not make the selection invalid', async () => {
      const selection = makeSelection(['kubernetes']);
      const result = await validateSelection(selection, registry);
      // Kubernetes alone has no requirement errors, only a warning
      expect(result.valid).toBe(true);
    });

    it('produces a warning for Vitest without Vite', async () => {
      const selection = makeSelection(['vitest']);
      const result = await validateSelection(selection, registry);
      expect(result.warnings.some((w) => w.includes('Vitest') && w.includes('Vite'))).toBe(true);
    });
  });

  describe('empty selection', () => {
    it('is valid when no technologies are selected', async () => {
      const selection = makeSelection([]);
      const result = await validateSelection(selection, registry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
