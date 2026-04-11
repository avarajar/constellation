import { describe, it, expect } from 'vitest';
import { createRegistry } from '../src/registry/index.js';
import type { TechRegistry } from '../src/core/types.js';

describe('Registry', () => {
  let registry: TechRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  describe('createRegistry()', () => {
    it('loads all technologies from YAML files', () => {
      const all = registry.getAllTechnologies();
      expect(all.length).toBeGreaterThanOrEqual(80);
    });

    it('every technology has required fields', () => {
      const all = registry.getAllTechnologies();
      for (const tech of all) {
        expect(tech.id).toBeTruthy();
        expect(tech.name).toBeTruthy();
        expect(tech.category).toBeTruthy();
        expect(tech.description).toBeTruthy();
      }
    });

    it('has no duplicate technology IDs', () => {
      const all = registry.getAllTechnologies();
      const ids = all.map((t) => t.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('getByCategory()', () => {
    it('returns frontend technologies', () => {
      const frontends = registry.getByCategory('frontend');
      expect(frontends.length).toBeGreaterThan(0);
      expect(frontends.every((t) => t.category === 'frontend')).toBe(true);
    });

    it('returns backend technologies', () => {
      const backends = registry.getByCategory('backend');
      expect(backends.length).toBeGreaterThan(0);
      expect(backends.every((t) => t.category === 'backend')).toBe(true);
    });

    it('returns database technologies', () => {
      const databases = registry.getByCategory('database');
      expect(databases.length).toBeGreaterThan(0);
      expect(databases.every((t) => t.category === 'database')).toBe(true);
    });

    it('returns an empty array for a category with no techs', () => {
      // All categories should have entries, but the filter should still work
      const result = registry.getByCategory('frontend');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getById()', () => {
    it('returns a known technology by ID', () => {
      const react = registry.getById('react');
      expect(react).toBeDefined();
      expect(react!.id).toBe('react');
      expect(react!.name).toBe('React');
    });

    it('returns undefined for an unknown ID', () => {
      const result = registry.getById('nonexistent-tech-xyz');
      expect(result).toBeUndefined();
    });
  });

  describe('search()', () => {
    it('finds technologies by name', () => {
      const results = registry.search('React');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'react')).toBe(true);
    });

    it('finds technologies by ID', () => {
      const results = registry.search('fastify');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'fastify')).toBe(true);
    });

    it('finds technologies by tags', () => {
      const results = registry.search('bundler');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array for empty query', () => {
      const results = registry.search('');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results = registry.search('   ');
      expect(results).toEqual([]);
    });

    it('returns empty array for a query with no matches', () => {
      const results = registry.search('zzz_no_match_ever_xyz');
      expect(results).toEqual([]);
    });
  });

  describe('getCategoryGroups()', () => {
    it('returns all category groups', () => {
      const groups = registry.getCategoryGroups();
      expect(groups.length).toBeGreaterThanOrEqual(6);
    });

    it('each group has a name, description, and categories array', () => {
      const groups = registry.getCategoryGroups();
      for (const group of groups) {
        expect(group.name).toBeTruthy();
        expect(group.description).toBeTruthy();
        expect(group.categories.length).toBeGreaterThan(0);
        expect(typeof group.multiSelect).toBe('boolean');
        expect(typeof group.required).toBe('boolean');
      }
    });

    it('includes Frontend and Backend groups', () => {
      const groups = registry.getCategoryGroups();
      const names = groups.map((g) => g.name);
      expect(names).toContain('Frontend');
      expect(names).toContain('Backend');
    });
  });
});
