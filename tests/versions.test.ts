import { describe, it, expect } from 'vitest';
import { fetchPackageVersion, inferEcosystem } from '../src/registry/versions.js';

describe('inferEcosystem()', () => {
  it('infers npm for typescript language', () => {
    expect(inferEcosystem('typescript')).toBe('npm');
  });
  it('infers pypi for python language', () => {
    expect(inferEcosystem('python')).toBe('pypi');
  });
  it('infers crates for rust language', () => {
    expect(inferEcosystem('rust')).toBe('crates');
  });
  it('infers go for go language', () => {
    expect(inferEcosystem('go')).toBe('go');
  });
  it('infers maven for java language', () => {
    expect(inferEcosystem('java')).toBe('maven');
  });
  it('infers nuget for csharp language', () => {
    expect(inferEcosystem('csharp')).toBe('nuget');
  });
  it('returns undefined for unknown language', () => {
    expect(inferEcosystem('brainfuck')).toBeUndefined();
  });
  it('returns undefined for undefined language', () => {
    expect(inferEcosystem(undefined)).toBeUndefined();
  });
});
