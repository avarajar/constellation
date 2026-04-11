import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listDirectories } from '../src/web/api.js';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('listDirectories()', () => {
  const testDir = join(tmpdir(), 'constellation-test-browse');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'projects'), { recursive: true });
    mkdirSync(join(testDir, 'documents'), { recursive: true });
    mkdirSync(join(testDir, '.hidden'), { recursive: true });
    mkdirSync(join(testDir, 'node_modules'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('lists visible subdirectories', () => {
    const result = listDirectories(testDir);
    expect(result.dirs).toContain('documents');
    expect(result.dirs).toContain('projects');
  });

  it('excludes hidden directories', () => {
    const result = listDirectories(testDir);
    expect(result.dirs).not.toContain('.hidden');
  });

  it('excludes node_modules', () => {
    const result = listDirectories(testDir);
    expect(result.dirs).not.toContain('node_modules');
  });

  it('returns parent path', () => {
    const result = listDirectories(testDir);
    expect(result.parent).toBeTruthy();
  });

  it('returns sorted directories', () => {
    const result = listDirectories(testDir);
    const sorted = [...result.dirs].sort();
    expect(result.dirs).toEqual(sorted);
  });

  it('returns empty dirs for nonexistent path', () => {
    const result = listDirectories('/nonexistent/path/xyz');
    expect(result.dirs).toEqual([]);
  });
});
