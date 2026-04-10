import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/core/pipeline.js';
import { createRegistry } from '../src/registry/index.js';
import type { GeneratorContext, PipelineEvent, TechRegistry } from '../src/core/types.js';

describe('Pipeline', () => {
  let registry: TechRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  const makeCtx = (techIds: string[], name = 'test-project'): GeneratorContext => ({
    selection: {
      name,
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

  describe('validation', () => {
    it('throws if project name is empty', async () => {
      const ctx = makeCtx(['react'], '');
      await expect(runPipeline(ctx)).rejects.toThrow('Project name is required');
    });

    it('throws if no technologies are selected', async () => {
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
      await expect(runPipeline(ctx)).rejects.toThrow('At least one technology must be selected');
    });
  });

  describe('hooks', () => {
    it('emits pipeline events via the hook callback', async () => {
      const events: PipelineEvent[] = [];
      const hook = vi.fn((event: PipelineEvent) => {
        events.push(event);
      });

      const ctx = makeCtx(['react', 'fastify']);
      await runPipeline(ctx, hook);

      expect(hook).toHaveBeenCalled();
      expect(events.length).toBeGreaterThan(0);

      // Should start with validate
      expect(events[0].step).toBe('validate');
      expect(events[0].status).toBe('start');

      // Should end with finalize complete
      const last = events[events.length - 1];
      expect(last.step).toBe('finalize');
      expect(last.status).toBe('complete');
    });

    it('emits start and complete for each executed step', async () => {
      const events: PipelineEvent[] = [];
      const hook = (event: PipelineEvent) => events.push(event);

      const ctx = makeCtx(['react', 'fastify']);
      await runPipeline(ctx, hook);

      // Every step that starts should also complete
      const startSteps = events.filter((e) => e.status === 'start').map((e) => e.step);
      const completeSteps = events.filter((e) => e.status === 'complete').map((e) => e.step);

      for (const step of startSteps) {
        expect(completeSteps).toContain(step);
      }
    });

    it('emits an error event when validation fails', async () => {
      const events: PipelineEvent[] = [];
      const hook = (event: PipelineEvent) => events.push(event);

      const ctx = makeCtx(['react'], '');

      await expect(runPipeline(ctx, hook)).rejects.toThrow();

      const errorEvents = events.filter((e) => e.status === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].step).toBe('validate');
    });
  });

  describe('generator groups', () => {
    it('runs frontend generator when frontend techs are selected', async () => {
      const events: PipelineEvent[] = [];
      const hook = (event: PipelineEvent) => events.push(event);

      const ctx = makeCtx(['react', 'fastify']);
      const result = await runPipeline(ctx, hook);

      const steps = events.map((e) => e.step);
      expect(steps).toContain('generate-frontend');
      expect(result.files.some((f) => f.path.includes('frontend/'))).toBe(true);
    });

    it('runs backend generator when backend techs are selected', async () => {
      const events: PipelineEvent[] = [];
      const hook = (event: PipelineEvent) => events.push(event);

      const ctx = makeCtx(['react', 'fastify']);
      const result = await runPipeline(ctx, hook);

      const steps = events.map((e) => e.step);
      expect(steps).toContain('generate-backend');
      expect(result.files.some((f) => f.path.includes('backend/'))).toBe(true);
    });

    it('skips infra generator when no infra techs are selected', async () => {
      const events: PipelineEvent[] = [];
      const hook = (event: PipelineEvent) => events.push(event);

      const ctx = makeCtx(['react', 'fastify']);
      await runPipeline(ctx, hook);

      const steps = events.map((e) => e.step);
      expect(steps).not.toContain('generate-infra');
    });

    it('always runs common generator', async () => {
      const events: PipelineEvent[] = [];
      const hook = (event: PipelineEvent) => events.push(event);

      const ctx = makeCtx(['react']);
      const result = await runPipeline(ctx, hook);

      const steps = events.map((e) => e.step);
      expect(steps).toContain('generate-common');
      expect(result.files.some((f) => f.path === 'README.md')).toBe(true);
    });
  });

  describe('result merging', () => {
    it('merges files from multiple generators', async () => {
      const ctx = makeCtx(['react', 'fastify']);
      const result = await runPipeline(ctx);

      // Should contain files from frontend, backend, and common generators
      const hasFrontendFile = result.files.some((f) => f.path.startsWith('frontend/'));
      const hasBackendFile = result.files.some((f) => f.path.startsWith('backend/'));
      const hasReadme = result.files.some((f) => f.path === 'README.md');

      expect(hasFrontendFile).toBe(true);
      expect(hasBackendFile).toBe(true);
      expect(hasReadme).toBe(true);
    });

    it('collects commands from all generators', async () => {
      const ctx = makeCtx(['react', 'fastify']);
      const result = await runPipeline(ctx);

      // Both frontend and backend generators emit npm install commands
      expect(result.commands!.length).toBeGreaterThanOrEqual(1);
    });

    it('collects messages from generators', async () => {
      const ctx = makeCtx(['react', 'fastify']);
      const result = await runPipeline(ctx);

      // Common generator emits messages about setup.sh and .env
      expect(result.messages!.length).toBeGreaterThan(0);
    });
  });
});
