# Constellation Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix outdated versions via dynamic fetching, add a directory picker with autocomplete and browse modal, move/conditionally show the monorepo question, and split the monolithic skill into per-category skills.

**Architecture:** Four independent improvements applied in sequence. Version fetching extracts registry search functions into a shared module and adds a caching layer. Directory picker adds two API endpoints and frontend UI. Monorepo question moves from step 1 HTML/JS to step 2 with conditional rendering. Skills split from one SKILL.md into an orchestrator plus seven category skills.

**Tech Stack:** TypeScript, Node.js, Vitest, vanilla JS (web UI), YAML, Markdown

---

## File Structure

### New files
- `src/registry/versions.ts` — shared version-fetching logic (extracted from `api.ts`)
- `plugin/skills/frontend/SKILL.md` — frontend generation skill
- `plugin/skills/backend/SKILL.md` — backend generation skill
- `plugin/skills/database/SKILL.md` — database/ORM/cache generation skill
- `plugin/skills/infrastructure/SKILL.md` — Docker, CI/CD, cloud skill
- `plugin/skills/testing/SKILL.md` — testing setup skill
- `plugin/skills/monitoring/SKILL.md` — observability/logging/error tracking skill
- `plugin/skills/common/SKILL.md` — README, .gitignore, Makefile, etc. skill
- `tests/versions.test.ts` — tests for version fetching module
- `tests/browse-dirs.test.ts` — tests for directory browse API

### Modified files
- `src/core/types.ts` — make `version` optional, add `package?` and `ecosystem?`
- `src/registry/technologies/backend.yml` — add `package`/`ecosystem`, make `version` fallback
- `src/registry/technologies/frontend.yml` — same
- `src/registry/technologies/database.yml` — same
- `src/registry/technologies/infrastructure.yml` — same
- `src/registry/technologies/testing.yml` — same
- `src/registry/technologies/monitoring.yml` — same
- `src/registry/index.ts` — integrate version fetching, add `enrichVersions()`
- `src/web/api.ts` — add browse-dirs/create-dir handlers, replace inline search with shared module
- `src/web/server.ts` — register new routes, trigger version fetch on startup
- `src/web/public/index.html` — move monorepo section, add browse modal template, add browse button
- `src/web/public/app.js` — autocomplete, browse modal, monorepo conditional rendering
- `src/web/public/styles.css` — autocomplete dropdown, browse modal, workspace section styles
- `src/cli/prompts.ts` — move monorepo question after tech selection
- `plugin/skills/generate/SKILL.md` — slim down to orchestrator
- `commands/constellation.md` — minor update
- `tests/registry.test.ts` — update version assertion

---

## Task 1: Extract version-fetching module

**Files:**
- Create: `src/registry/versions.ts`
- Modify: `src/web/api.ts`
- Test: `tests/versions.test.ts`

- [ ] **Step 1: Write the failing test for `fetchPackageVersion`**

```typescript
// tests/versions.test.ts
import { describe, it, expect, vi } from 'vitest';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd .tasks/improvements && npx vitest run tests/versions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/registry/versions.ts` with `inferEcosystem` and `fetchPackageVersion`**

```typescript
// src/registry/versions.ts

export type Ecosystem = 'npm' | 'pypi' | 'crates' | 'go' | 'maven' | 'nuget';

const LANGUAGE_ECOSYSTEM_MAP: Record<string, Ecosystem> = {
  typescript: 'npm',
  javascript: 'npm',
  python: 'pypi',
  rust: 'crates',
  go: 'go',
  java: 'maven',
  csharp: 'nuget',
  scss: 'npm',
  css: 'npm',
};

export function inferEcosystem(language: string | undefined): Ecosystem | undefined {
  if (!language) return undefined;
  return LANGUAGE_ECOSYSTEM_MAP[language.toLowerCase()];
}

export async function fetchPackageVersion(
  packageName: string,
  ecosystem: Ecosystem,
): Promise<string | undefined> {
  try {
    switch (ecosystem) {
      case 'npm':
        return await fetchNpmVersion(packageName);
      case 'pypi':
        return await fetchPypiVersion(packageName);
      case 'crates':
        return await fetchCratesVersion(packageName);
      case 'go':
        return await fetchGoVersion(packageName);
      case 'maven':
        return await fetchMavenVersion(packageName);
      case 'nuget':
        return await fetchNugetVersion(packageName);
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

async function fetchNpmVersion(name: string): Promise<string | undefined> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { version?: string };
  return data.version;
}

async function fetchPypiVersion(name: string): Promise<string | undefined> {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { info?: { version?: string } };
  return data.info?.version;
}

async function fetchCratesVersion(name: string): Promise<string | undefined> {
  const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
    headers: { 'User-Agent': 'constellation-project-generator' },
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { crate?: { max_version?: string } };
  return data.crate?.max_version;
}

async function fetchGoVersion(name: string): Promise<string | undefined> {
  const res = await fetch(`https://proxy.golang.org/${encodeURIComponent(name)}/@latest`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as { Version?: string };
  return data.Version?.replace(/^v/, '');
}

async function fetchMavenVersion(name: string): Promise<string | undefined> {
  // name expected as "group:artifact" e.g. "org.springframework.boot:spring-boot"
  const [group, artifact] = name.split(':');
  if (!group || !artifact) return undefined;
  const res = await fetch(
    `https://search.maven.org/solrsearch/select?q=g:${encodeURIComponent(group)}+AND+a:${encodeURIComponent(artifact)}&rows=1&wt=json`,
  );
  if (!res.ok) return undefined;
  const data = (await res.json()) as { response?: { docs?: Array<{ latestVersion?: string }> } };
  return data.response?.docs?.[0]?.latestVersion;
}

async function fetchNugetVersion(name: string): Promise<string | undefined> {
  const res = await fetch(
    `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(name.toLowerCase())}/index.json`,
  );
  if (!res.ok) return undefined;
  const data = (await res.json()) as { versions?: string[] };
  const versions = data.versions;
  return versions?.[versions.length - 1];
}

// ── Batch fetch with caching ──────────────────────────────────

interface VersionCache {
  versions: Map<string, string>;
  fetchedAt: number;
}

let cache: VersionCache | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function isCacheFresh(): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

export function getCachedVersion(techId: string): string | undefined {
  if (!cache || !isCacheFresh()) return undefined;
  return cache.versions.get(techId);
}

export async function fetchAllVersions(
  technologies: Array<{ id: string; package?: string; ecosystem?: string; language?: string }>,
): Promise<Map<string, string>> {
  if (cache && isCacheFresh()) return cache.versions;

  const versions = new Map<string, string>();
  const promises: Array<Promise<void>> = [];

  for (const tech of technologies) {
    const eco = (tech.ecosystem as Ecosystem) || inferEcosystem(tech.language);
    const pkg = tech.package || tech.id;
    if (!eco) continue;

    promises.push(
      fetchPackageVersion(pkg, eco).then((version) => {
        if (version) versions.set(tech.id, version);
      }),
    );
  }

  await Promise.allSettled(promises);

  cache = { versions, fetchedAt: Date.now() };
  return versions;
}

export function clearVersionCache(): void {
  cache = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd .tasks/improvements && npx vitest run tests/versions.test.ts`
Expected: PASS for all `inferEcosystem` tests

- [ ] **Step 5: Commit**

```bash
cd .tasks/improvements && git add src/registry/versions.ts tests/versions.test.ts && git commit -m "feat: add version-fetching module with ecosystem inference and caching"
```

---

## Task 2: Update Technology type and YAML files

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/registry/technologies/backend.yml`
- Modify: `src/registry/technologies/frontend.yml`
- Modify: `src/registry/technologies/database.yml`
- Modify: `src/registry/technologies/infrastructure.yml`
- Modify: `src/registry/technologies/testing.yml`
- Modify: `src/registry/technologies/monitoring.yml`
- Modify: `tests/registry.test.ts`

- [ ] **Step 1: Update `Technology` interface in `src/core/types.ts`**

Change `version: string` to `version?: string` and add `package?` and `ecosystem?` fields:

```typescript
export interface Technology {
  id: string;
  name: string;
  category: TechCategory;
  description: string;
  language?: string;
  requires?: string[];
  conflicts?: string[];
  tags?: string[];
  version?: string;
  package?: string;
  ecosystem?: string;
  homepage?: string;
}
```

- [ ] **Step 2: Update all 6 YAML files — add `package` field to each technology**

For each technology entry, add a `package` field with the registry package name. Examples:

`backend.yml`:
- `express`: add `package: "express"`
- `django`: add `package: "django"`
- `spring-boot`: add `package: "org.springframework.boot:spring-boot"`, `ecosystem: "maven"`
- `aspnet-core`: add `package: "Microsoft.AspNetCore.App"`, `ecosystem: "nuget"`
- `gin`: add `package: "github.com/gin-gonic/gin"`, `ecosystem: "go"`
- `echo`: add `package: "github.com/labstack/echo/v4"`, `ecosystem: "go"`
- `chi`: add `package: "github.com/go-chi/chi/v5"`, `ecosystem: "go"`

`frontend.yml`:
- `react`: add `package: "react"`
- `vue`: add `package: "vue"`
- `nextjs`: add `package: "next"`
- `nuxt`: add `package: "nuxt"`
- `tailwind`: add `package: "tailwindcss"`
- `vite`: add `package: "vite"`
- `webpack`: add `package: "webpack"`
- `redux`: add `package: "@reduxjs/toolkit"`
- `zustand`: add `package: "zustand"`

`database.yml`:
- `prisma`: add `package: "prisma"`
- `typeorm`: add `package: "typeorm"`
- `sequelize`: add `package: "sequelize"`
- `sqlalchemy`: add `package: "sqlalchemy"`
- `entity-framework`: add `package: "Microsoft.EntityFrameworkCore"`, `ecosystem: "nuget"`
- For databases themselves (postgresql, mysql, mongodb, redis, etc.) — these are not npm/pypi packages, so add `ecosystem: "none"` to skip version fetching. Their versions will use the YAML fallback.

`infrastructure.yml`:
- Cloud platforms, CI/CD tools — add `ecosystem: "none"` since they don't have package versions.
- `docker-compose`: add `ecosystem: "none"`
- `kubernetes`: add `ecosystem: "none"`

`testing.yml`:
- `jest`: add `package: "jest"`
- `vitest`: add `package: "vitest"`
- `pytest`: add `package: "pytest"`
- `cypress`: add `package: "cypress"`
- `playwright`: add `package: "@playwright/test"`

`monitoring.yml`:
- Most are SaaS/self-hosted — add `ecosystem: "none"`
- `sentry`: add `package: "@sentry/node"` (npm client library version)
- `grafana`: add `ecosystem: "none"`
- `prometheus`: add `ecosystem: "none"`

- [ ] **Step 3: Update test — version is now optional**

In `tests/registry.test.ts`, change the test "every technology has required fields":

```typescript
it('every technology has required fields', () => {
  const all = registry.getAllTechnologies();
  for (const tech of all) {
    expect(tech.id).toBeTruthy();
    expect(tech.name).toBeTruthy();
    expect(tech.category).toBeTruthy();
    expect(tech.description).toBeTruthy();
    // version is now optional (fetched dynamically)
  }
});
```

- [ ] **Step 4: Run all tests**

Run: `cd .tasks/improvements && npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd .tasks/improvements && git add src/core/types.ts src/registry/technologies/ tests/registry.test.ts && git commit -m "feat: make version optional in Technology type, add package/ecosystem to YAML"
```

---

## Task 3: Integrate version fetching into registry and API

**Files:**
- Modify: `src/registry/index.ts`
- Modify: `src/web/api.ts`
- Modify: `src/web/server.ts`

- [ ] **Step 1: Add `enrichWithVersions` to registry**

In `src/registry/index.ts`, add a method to the `Registry` class and the `TechRegistry` interface update. Add import and enrich method:

```typescript
// At top of src/registry/index.ts, add:
import { fetchAllVersions, getCachedVersion } from './versions.js';

// Add to Registry class:
async enrichWithVersions(): Promise<void> {
  const versions = await fetchAllVersions(this.technologies);
  for (const tech of this.technologies) {
    const fetched = versions.get(tech.id);
    if (fetched) {
      tech.version = fetched;
    }
    // If no fetched version and no YAML version, set "latest"
    if (!tech.version) {
      tech.version = 'latest';
    }
  }
}
```

Add `enrichWithVersions(): Promise<void>` to the `TechRegistry` interface in `src/core/types.ts`.

- [ ] **Step 2: Update `handleGetTechnologies` in `src/web/api.ts` to enrich versions**

```typescript
export async function handleGetTechnologies(res: ServerResponse): Promise<void> {
  try {
    const registry = createRegistry();
    await registry.enrichWithVersions();
    const groups = registry.getCategoryGroups();
    const allTechs = registry.getAllTechnologies();

    const result = groups.map((group) => ({
      name: group.name,
      description: group.description,
      multiSelect: group.multiSelect,
      required: group.required,
      categories: group.categories.map((cat) => ({
        id: cat,
        technologies: allTechs.filter((t) => t.category === cat),
      })),
    }));

    json(res, 200, { groups: result });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}
```

Note: The function signature changes from sync to async. Update `server.ts` to await it.

- [ ] **Step 3: Update `server.ts` to await the now-async handler**

In `src/web/server.ts`, change line:
```typescript
handleGetTechnologies(res);
```
to:
```typescript
await handleGetTechnologies(res);
```

- [ ] **Step 4: Extract search functions from `api.ts` to use shared module**

In `src/web/api.ts`, replace the `searchNpm`, `searchPypi`, `searchCrates` functions. Keep them in `api.ts` since they return `OnlineSearchResult[]` (different shape from the version-only fetch in `versions.ts`). No extraction needed — the search functions serve a different purpose (returning name, description, homepage for the UI).

- [ ] **Step 5: Run all tests**

Run: `cd .tasks/improvements && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Test manually — start the web server and verify versions load**

Run: `cd .tasks/improvements && npm run dev -- web`
Open http://localhost:3210, go to step 2, check that tech cards show fetched versions.

- [ ] **Step 7: Commit**

```bash
cd .tasks/improvements && git add src/registry/index.ts src/web/api.ts src/web/server.ts src/core/types.ts && git commit -m "feat: enrich technologies with latest versions from package registries"
```

---

## Task 4: Add directory browse API endpoints

**Files:**
- Modify: `src/web/api.ts`
- Modify: `src/web/server.ts`
- Test: `tests/browse-dirs.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/browse-dirs.test.ts
import { describe, it, expect } from 'vitest';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd .tasks/improvements && npx vitest run tests/browse-dirs.test.ts`
Expected: FAIL — `listDirectories` not found

- [ ] **Step 3: Implement `listDirectories` and handlers in `src/web/api.ts`**

Add at the top of `api.ts`:
```typescript
import { readdirSync, statSync, mkdirSync } from 'node:fs';
```

Add the function and handlers:
```typescript
// ─── Directory Browsing ──────────────────────────────────────────

const HIDDEN_DIR_PATTERNS = [/^\./, /^node_modules$/, /^__pycache__$/, /^\.git$/, /^dist$/, /^build$/];

export function listDirectories(dirPath: string): { dirs: string[]; parent: string | null } {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const dirs = entries
      .filter((e) => {
        if (!e.isDirectory()) return false;
        return !HIDDEN_DIR_PATTERNS.some((p) => p.test(e.name));
      })
      .map((e) => e.name)
      .sort();

    const parent = dirname(dirPath) !== dirPath ? dirname(dirPath) : null;
    return { dirs, parent };
  } catch {
    return { dirs: [], parent: null };
  }
}

export function handleBrowseDirs(path: string, res: ServerResponse): void {
  const dirPath = path || homedir();
  const result = listDirectories(dirPath);
  json(res, 200, result);
}

export function handleCreateDir(body: unknown, res: ServerResponse): void {
  try {
    if (!body || typeof body !== 'object') {
      errorResponse(res, 400, 'Request body must include a "path" string.');
      return;
    }
    const { path: dirPath } = body as { path: string };
    if (!dirPath) {
      errorResponse(res, 400, '"path" is required.');
      return;
    }
    mkdirSync(dirPath, { recursive: true });
    json(res, 200, { success: true, path: dirPath });
  } catch (err) {
    errorResponse(res, 500, err instanceof Error ? err.message : String(err));
  }
}
```

Note: `dirname` is already imported from `node:path`. Add `mkdirSync` to the `fs` import at top (alongside the existing `mkdir` from `fs/promises`). Also add `readdirSync` and `statSync` if not already there.

- [ ] **Step 4: Register routes in `src/web/server.ts`**

Add imports:
```typescript
import {
  // ...existing imports...
  handleBrowseDirs,
  handleCreateDir,
} from './api.js';
```

Add routes before the static file serving block:
```typescript
if (pathname === '/api/browse-dirs' && method === 'GET') {
  const dirPath = url.searchParams.get('path') || '';
  handleBrowseDirs(dirPath, res);
  return;
}

if (pathname === '/api/create-dir' && method === 'POST') {
  const body = await parseBody(req);
  handleCreateDir(body, res);
  return;
}
```

- [ ] **Step 5: Run tests**

Run: `cd .tasks/improvements && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
cd .tasks/improvements && git add src/web/api.ts src/web/server.ts tests/browse-dirs.test.ts && git commit -m "feat: add directory browse and create API endpoints"
```

---

## Task 5: Add directory autocomplete and browse modal to web UI

**Files:**
- Modify: `src/web/public/index.html`
- Modify: `src/web/public/app.js`
- Modify: `src/web/public/styles.css`

- [ ] **Step 1: Update `index.html` — add browse button and modal template**

In `index.html`, replace the output directory field (lines 68-73):
```html
<div class="field">
  <label for="outputDir">Output Directory</label>
  <div class="output-dir-row">
    <div class="output-dir-input-wrapper">
      <input type="text" id="outputDir" placeholder="/Users/joselito/projects/my-awesome-app" autocomplete="off">
      <div class="dir-autocomplete hidden" id="dirAutocomplete"></div>
    </div>
    <button type="button" class="btn btn-ghost btn-browse" id="btnBrowse">Browse</button>
  </div>
  <span class="field-hint" id="outputDirHint">Where the project will be generated.</span>
  <span class="field-resolved-path" id="resolvedPath"></span>
</div>
```

Add browse modal template before `</body>`:
```html
<!-- Browse Directory Modal -->
<template id="tpl-browse-modal">
  <div class="browse-modal">
    <div class="browse-modal-content">
      <div class="browse-modal-header">
        <h3>Choose Directory</h3>
        <button class="browse-modal-close">&times;</button>
      </div>
      <div class="browse-breadcrumb" id="browseBreadcrumb"></div>
      <div class="browse-dirs-list" id="browseDirsList"></div>
      <div class="browse-modal-footer">
        <button class="btn btn-ghost btn-new-folder" id="btnNewFolder">New Folder</button>
        <button class="btn btn-primary btn-select-folder" id="btnSelectFolder">Select This Folder</button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Add autocomplete logic to `app.js`**

Add the autocomplete functions after the `fetchHomeDir` function (around line 154):

```javascript
// ── Directory Autocomplete ────────────────────────────────
async function fetchDirs(path) {
  try {
    const data = await api('GET', '/api/browse-dirs?path=' + encodeURIComponent(path));
    return data;
  } catch {
    return { dirs: [], parent: null };
  }
}

const debouncedDirAutocomplete = debounce(async (inputEl) => {
  const val = inputEl.value.trim();
  if (!val || val.length < 2) {
    hideDirAutocomplete();
    return;
  }

  const lastSlash = val.lastIndexOf('/');
  const parentPath = lastSlash > 0 ? val.substring(0, lastSlash) : '/';
  const partial = lastSlash >= 0 ? val.substring(lastSlash + 1).toLowerCase() : val.toLowerCase();

  const data = await fetchDirs(parentPath);
  const matches = data.dirs.filter(d => d.toLowerCase().startsWith(partial));

  const dropdown = document.getElementById('dirAutocomplete');
  if (!dropdown || matches.length === 0) {
    hideDirAutocomplete();
    return;
  }

  dropdown.innerHTML = matches.map(d =>
    `<div class="dir-autocomplete-item" data-path="${escHtml(parentPath + '/' + d)}">${escHtml(d)}/</div>`
  ).join('');
  dropdown.classList.remove('hidden');
}, 300);

function hideDirAutocomplete() {
  const dropdown = document.getElementById('dirAutocomplete');
  if (dropdown) dropdown.classList.add('hidden');
}
```

- [ ] **Step 3: Wire autocomplete into `renderStep1`**

In the `renderStep1` function, after the `dirInput` reference is set, add:

```javascript
// Directory autocomplete
dirInput.addEventListener('input', () => {
  debouncedDirAutocomplete(dirInput);
});

dirInput.addEventListener('keydown', (e) => {
  const dropdown = document.getElementById('dirAutocomplete');
  if (e.key === 'Escape') {
    hideDirAutocomplete();
  }
  if (e.key === 'Tab' && dropdown && !dropdown.classList.contains('hidden')) {
    e.preventDefault();
    const first = dropdown.querySelector('.dir-autocomplete-item');
    if (first) {
      dirInput.value = first.dataset.path + '/';
      state.project.outputDir = dirInput.value;
      updateResolvedPath();
      hideDirAutocomplete();
      debouncedDirAutocomplete(dirInput);
    }
  }
});

// Autocomplete item click (via delegation on section)
section.addEventListener('click', (e) => {
  const item = e.target.closest('.dir-autocomplete-item');
  if (item) {
    dirInput.value = item.dataset.path + '/';
    state.project.outputDir = dirInput.value;
    updateResolvedPath();
    hideDirAutocomplete();
    debouncedDirAutocomplete(dirInput);
  }
});

// Hide autocomplete on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.output-dir-input-wrapper')) {
    hideDirAutocomplete();
  }
});
```

- [ ] **Step 4: Add browse modal logic to `app.js`**

Add the browse modal function:

```javascript
// ── Browse Directory Modal ────────────────────────────────
function openBrowseModal(currentPath, onSelect) {
  const existing = document.querySelector('.browse-modal');
  if (existing) existing.remove();

  let browsePath = currentPath || state.homeDir + '/projects';

  const modal = cloneTemplate('tpl-browse-modal');
  document.body.appendChild(modal);

  const breadcrumbEl = $('#browseBreadcrumb', modal);
  const listEl = $('#browseDirsList', modal);
  const closeBtn = $('.browse-modal-close', modal);
  const selectBtn = $('#btnSelectFolder', modal);
  const newFolderBtn = $('#btnNewFolder', modal);

  async function navigate(path) {
    browsePath = path;
    const data = await fetchDirs(path);
    renderBreadcrumb(path);
    renderDirList(data);
  }

  function renderBreadcrumb(path) {
    const parts = path.split('/').filter(Boolean);
    let html = '<span class="browse-crumb" data-path="/">/</span>';
    let accumulated = '';
    for (const part of parts) {
      accumulated += '/' + part;
      html += ` <span class="browse-crumb-sep">/</span> <span class="browse-crumb" data-path="${escHtml(accumulated)}">${escHtml(part)}</span>`;
    }
    breadcrumbEl.innerHTML = html;
  }

  function renderDirList(data) {
    if (data.parent) {
      listEl.innerHTML = `<div class="browse-dir-item browse-dir-parent" data-path="${escHtml(data.parent)}">⬆ ..</div>`;
    } else {
      listEl.innerHTML = '';
    }

    if (data.dirs.length === 0) {
      listEl.innerHTML += '<div class="browse-dir-empty">No subdirectories</div>';
      return;
    }

    for (const dir of data.dirs) {
      const fullPath = browsePath.replace(/\/$/, '') + '/' + dir;
      listEl.innerHTML += `<div class="browse-dir-item" data-path="${escHtml(fullPath)}">📁 ${escHtml(dir)}</div>`;
    }
  }

  // Events
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();

    const crumb = e.target.closest('.browse-crumb');
    if (crumb) navigate(crumb.dataset.path);

    const dirItem = e.target.closest('.browse-dir-item');
    if (dirItem) navigate(dirItem.dataset.path);
  });

  closeBtn.addEventListener('click', () => modal.remove());

  selectBtn.addEventListener('click', () => {
    onSelect(browsePath);
    modal.remove();
  });

  newFolderBtn.addEventListener('click', async () => {
    const name = prompt('New folder name:');
    if (!name || !name.trim()) return;
    const newPath = browsePath.replace(/\/$/, '') + '/' + name.trim();
    try {
      await api('POST', '/api/create-dir', { path: newPath });
      navigate(browsePath);
      toast('Folder created: ' + name.trim(), 'success');
    } catch (err) {
      toast('Failed to create folder: ' + err.message, 'error');
    }
  });

  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', onKey);
    }
  });

  navigate(browsePath);
}
```

- [ ] **Step 5: Wire browse button in `renderStep1`**

In the `renderStep1` function, after the autocomplete setup, add:

```javascript
// Browse button
const browseBtn = $('#btnBrowse', section);
if (browseBtn) {
  browseBtn.addEventListener('click', () => {
    const startPath = dirInput.value || getDefaultOutputDir(state.project.name || 'my-app');
    openBrowseModal(startPath, (selectedPath) => {
      dirInput.value = selectedPath;
      state.project.outputDir = selectedPath;
      updateResolvedPath();
    });
  });
}
```

- [ ] **Step 6: Add CSS for autocomplete and browse modal in `styles.css`**

Add at the end of `styles.css`:

```css
/* ── Directory Autocomplete ─────────────────────────────── */
.output-dir-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.output-dir-input-wrapper {
  flex: 1;
  position: relative;
}

.output-dir-input-wrapper input {
  width: 100%;
}

.dir-autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-2, #1e1e2e);
  border: 1px solid var(--border, #333);
  border-radius: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dir-autocomplete.hidden {
  display: none;
}

.dir-autocomplete-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text, #e0e0e0);
}

.dir-autocomplete-item:hover {
  background: var(--surface-3, #2a2a3e);
}

/* ── Browse Modal ───────────────────────────────────────── */
.browse-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.browse-modal-content {
  background: var(--surface-1, #161622);
  border: 1px solid var(--border, #333);
  border-radius: 1rem;
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.browse-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border, #333);
}

.browse-modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.browse-modal-close {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  font-size: 1.5rem;
  cursor: pointer;
}

.browse-breadcrumb {
  padding: 0.75rem 1.25rem;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  border-bottom: 1px solid var(--border, #333);
  overflow-x: auto;
  white-space: nowrap;
}

.browse-crumb {
  cursor: pointer;
  color: var(--accent, #7c6bf0);
}

.browse-crumb:hover {
  text-decoration: underline;
}

.browse-crumb-sep {
  color: var(--text-muted, #555);
  margin: 0 0.15rem;
}

.browse-dirs-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.browse-dir-item {
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.browse-dir-item:hover {
  background: var(--surface-2, #1e1e2e);
}

.browse-dir-parent {
  color: var(--text-muted, #888);
}

.browse-dir-empty {
  padding: 1rem 1.25rem;
  color: var(--text-muted, #888);
  font-style: italic;
}

.browse-modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border, #333);
}

.btn-browse {
  white-space: nowrap;
  padding: 0.5rem 1rem;
}
```

- [ ] **Step 7: Test manually — start web server, verify autocomplete and browse modal work**

Run: `cd .tasks/improvements && npm run dev -- web`
Open http://localhost:3210, test:
1. Type a path in output dir — autocomplete dropdown appears
2. Tab to accept first suggestion
3. Click "Browse" — modal opens with directory listing
4. Navigate directories, create new folder, select folder

- [ ] **Step 8: Commit**

```bash
cd .tasks/improvements && git add src/web/public/ && git commit -m "feat: add directory autocomplete and browse modal to web UI"
```

---

## Task 6: Move monorepo question to step 2 with conditional rendering

**Files:**
- Modify: `src/web/public/index.html`
- Modify: `src/web/public/app.js`
- Modify: `src/web/public/styles.css`
- Modify: `src/cli/prompts.ts`

- [ ] **Step 1: Remove monorepo section from step 1 template in `index.html`**

Remove these lines from `<template id="tpl-step1">` (lines 84-98):
```html
<div class="field">
  <label>Monorepo</label>
  <div class="toggle-group" role="radiogroup" aria-label="Monorepo toggle">
    <button class="toggle-btn" data-monorepo="false" role="radio" aria-checked="true">No</button>
    <button class="toggle-btn" data-monorepo="true" role="radio" aria-checked="false">Yes</button>
  </div>
</div>

<div class="field monorepo-tool-field hidden">
  <label for="monorepoTool">Monorepo Tool</label>
  <div class="toggle-group" role="radiogroup" aria-label="Monorepo tool">
    <button class="toggle-btn" data-monorepo-tool="turborepo" role="radio" aria-checked="false">Turborepo</button>
    <button class="toggle-btn" data-monorepo-tool="nx" role="radio" aria-checked="false">Nx</button>
    <button class="toggle-btn" data-monorepo-tool="none" role="radio" aria-checked="false">None</button>
  </div>
</div>
```

- [ ] **Step 2: Add workspace section to step 2 template in `index.html`**

In `<template id="tpl-step2">`, before the `step-actions` div, add:
```html
<!-- Workspace Tooling (shown conditionally) -->
<div class="workspace-section hidden" id="workspaceSection">
  <h3 class="workspace-title">Project Structure</h3>
  <p class="workspace-hint">You selected both frontend and backend. Add workspace tooling to orchestrate builds across packages?</p>

  <div class="field">
    <label>Workspace Tooling</label>
    <div class="toggle-group" role="radiogroup" aria-label="Workspace tooling toggle">
      <button class="toggle-btn active" data-workspace="false" role="radio" aria-checked="true">No</button>
      <button class="toggle-btn" data-workspace="true" role="radio" aria-checked="false">Yes</button>
    </div>
  </div>

  <div class="field workspace-tool-field hidden" id="workspaceToolField">
    <label>Tool</label>
    <div class="toggle-group" role="radiogroup" aria-label="Workspace tool">
      <button class="toggle-btn" data-workspace-tool="turborepo" role="radio" aria-checked="false">Turborepo</button>
      <button class="toggle-btn" data-workspace-tool="nx" role="radio" aria-checked="false">Nx</button>
      <button class="toggle-btn" data-workspace-tool="none" role="radio" aria-checked="false">None (manual)</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Update `app.js` — remove monorepo logic from `renderStep1`**

Remove the monorepo toggle and tool handling from `renderStep1()`. Specifically remove:
- The monorepo toggle restoration block (around lines 290-294)
- The monorepo tool restoration block (around lines 296-302)
- The monorepo click handlers inside the `section.addEventListener('click', ...)` block (the `if (btn.dataset.monorepo !== undefined)` and `if (btn.dataset.monorepoTool)` blocks)
- The `toolField` reference

- [ ] **Step 4: Update `app.js` — add workspace section logic to `renderStep2`**

Add a helper function to check if both frontend and backend are selected:

```javascript
function hasFrontendAndBackend() {
  const frontendCats = new Set(['frontend', 'css', 'build', 'state']);
  const backendCats = new Set(['backend']);
  let hasFE = false;
  let hasBE = false;
  for (const tech of state.technologies) {
    if (state.selected.has(tech.id)) {
      if (frontendCats.has(tech.category)) hasFE = true;
      if (backendCats.has(tech.category)) hasBE = true;
    }
  }
  return hasFE && hasBE;
}
```

In `renderStep2()`, after the existing event listeners, add:

```javascript
// Workspace section — show/hide based on selection
function updateWorkspaceVisibility() {
  const ws = $('#workspaceSection', section);
  if (!ws) return;
  if (hasFrontendAndBackend()) {
    ws.classList.remove('hidden');
  } else {
    ws.classList.add('hidden');
    // Reset monorepo state if hidden
    state.project.monorepo.enabled = false;
    state.project.monorepo.tool = null;
  }
}
updateWorkspaceVisibility();

// Workspace toggle events
section.addEventListener('click', (e) => {
  const wsBtn = e.target.closest('[data-workspace]');
  if (wsBtn) {
    state.project.monorepo.enabled = wsBtn.dataset.workspace === 'true';
    $$('[data-workspace]', section).forEach(b => {
      b.classList.toggle('active', (b.dataset.workspace === 'true') === state.project.monorepo.enabled);
      b.setAttribute('aria-checked', (b.dataset.workspace === 'true') === state.project.monorepo.enabled);
    });
    const toolField = $('#workspaceToolField', section);
    if (toolField) toolField.classList.toggle('hidden', !state.project.monorepo.enabled);
  }

  const toolBtn = e.target.closest('[data-workspace-tool]');
  if (toolBtn) {
    state.project.monorepo.tool = toolBtn.dataset.workspaceTool;
    $$('[data-workspace-tool]', section).forEach(b => {
      b.classList.toggle('active', b.dataset.workspaceTool === state.project.monorepo.tool);
    });
  }
});
```

Also update `toggleTech` to call `updateWorkspaceVisibility()` after toggling — the simplest way is to add it inside the existing card click handler in `renderStep2`:

After `updateGroupCounts(section);` inside the card click handler, add:
```javascript
updateWorkspaceVisibility();
```

- [ ] **Step 5: Add CSS for workspace section in `styles.css`**

```css
/* ── Workspace Section ──────────────────────────────────── */
.workspace-section {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--border, #333);
  border-radius: 0.75rem;
  background: var(--surface-1, #161622);
}

.workspace-title {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}

.workspace-hint {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  margin-bottom: 1rem;
}
```

- [ ] **Step 6: Update CLI prompts — move monorepo question after tech selection**

In `src/cli/prompts.ts`, move the monorepo question block from before the tech selection loop to after it. Add a conditional check:

```typescript
// ── Workspace tooling (only if both frontend and backend selected) ──
const frontendCats = new Set(['frontend', 'css', 'build', 'state']);
const backendCats = new Set(['backend']);
const hasFE = selectedTechs.some((t) => frontendCats.has(t.category));
const hasBE = selectedTechs.some((t) => backendCats.has(t.category));

let monorepoEnabled = false;
let monorepoTool: 'turborepo' | 'nx' | 'none' | undefined;

if (hasFE && hasBE) {
  monorepoEnabled = await confirm({
    message: 'Add workspace tooling? (Turborepo/Nx to orchestrate frontend + backend builds)',
    default: false,
  });

  if (monorepoEnabled) {
    monorepoTool = await select<'turborepo' | 'nx' | 'none'>({
      message: 'Workspace tool:',
      choices: [
        { name: 'Turborepo', value: 'turborepo', description: 'High-performance build system by Vercel' },
        { name: 'Nx', value: 'nx', description: 'Smart, fast, extensible build system' },
        { name: 'None (manual)', value: 'none', description: 'Workspace setup without a dedicated tool' },
      ],
    });
  }
}
```

Remove the old monorepo block (lines 53-68 in the original).

- [ ] **Step 7: Test manually — verify monorepo section appears/disappears correctly**

Run: `cd .tasks/improvements && npm run dev -- web`
1. Go to step 2, select only frontend techs → workspace section stays hidden
2. Add a backend tech → workspace section appears
3. Remove the backend tech → workspace section disappears
4. Also test CLI: `cd .tasks/improvements && npm run dev -- new`

- [ ] **Step 8: Commit**

```bash
cd .tasks/improvements && git add src/web/public/ src/cli/prompts.ts && git commit -m "feat: move workspace tooling question to step 2, show conditionally"
```

---

## Task 7: Split monolithic skill into per-category skills

**Files:**
- Modify: `plugin/skills/generate/SKILL.md`
- Create: `plugin/skills/frontend/SKILL.md`
- Create: `plugin/skills/backend/SKILL.md`
- Create: `plugin/skills/database/SKILL.md`
- Create: `plugin/skills/infrastructure/SKILL.md`
- Create: `plugin/skills/testing/SKILL.md`
- Create: `plugin/skills/monitoring/SKILL.md`
- Create: `plugin/skills/common/SKILL.md`

- [ ] **Step 1: Create `plugin/skills/frontend/SKILL.md`**

```markdown
---
description: Generate or add a frontend layer to a project — framework, CSS, state management, build tool, and CRUD UI
---

# Constellation — Frontend Generation

Generate the `frontend/` directory with a complete, working frontend application.

## What You Need

Either read from a Constellation blueprint YAML (`stack.frontend` section), or accept these inputs directly:
- **Framework**: React, Vue, Svelte, Angular, Solid, Qwik, Next.js, Nuxt, Astro
- **CSS solution**: Tailwind, Styled Components, CSS Modules, Sass, PostCSS
- **State management**: Redux, Zustand, Jotai, Recoil, Pinia, Vuex
- **Build tool**: Vite, Webpack, Turbopack, esbuild
- **CRUD entity**: name and fields for the sample CRUD UI

## What You Generate

- Project scaffolding for the specified framework
- CSS solution integration
- State management setup
- Build tool configuration
- A fully working CRUD UI for the specified entity:
  - List view with all items
  - Create form with validation
  - Edit form
  - Delete confirmation
- TypeScript configuration (if applicable)
- package.json with dependency versions
- index.html, main entry point, App component
- Router setup if the framework supports it
- API service layer that calls the backend REST endpoints

## Guidelines

- Generate **real, functional code** — not boilerplate stubs
- Use current stable versions for all dependencies
- All code must be properly formatted with consistent style
- Include appropriate error handling
- Frontend must connect to the backend API with proper error states and loading indicators
- The CRUD entity name and fields drive ALL generated code
- Pluralize the entity name for REST routes (e.g., "Item" → "/api/items")

## Standalone Usage

To add a frontend to an existing project without the full Constellation flow:

1. Ask the user which framework, CSS, state management, and build tool they want
2. Ask for the output directory
3. Ask for CRUD entity details (or skip CRUD if not needed)
4. Generate the frontend/ directory following the guidelines above
```

- [ ] **Step 2: Create `plugin/skills/backend/SKILL.md`**

```markdown
---
description: Generate or add a backend layer to a project — server framework, REST API, database connection, and CRUD endpoints
---

# Constellation — Backend Generation

Generate the `backend/` directory with a complete, working backend application.

## What You Need

Either read from a Constellation blueprint YAML (`stack.backend` + `stack.database` sections), or accept these inputs directly:
- **Framework**: Express, Fastify, Hono, NestJS, Elysia, Django, Flask, FastAPI, Starlette, Gin, Echo, Chi, Actix, Axum, Rocket, Spring Boot, Quarkus, ASP.NET Core
- **Language/Runtime**: TypeScript/Node.js, Python, Go, Rust, Java, C#
- **Database + ORM** (optional): PostgreSQL/MySQL/MongoDB + Prisma/TypeORM/SQLAlchemy/etc.
- **CRUD entity**: name and fields for the sample REST API
- **Features**: CORS, health check, error handling, env config

## What You Generate

- Server setup with the specified framework
- Correct language and runtime configuration
- CORS middleware (if requested)
- Health check endpoint at GET /health (if requested)
- Error handling middleware (if requested)
- Environment variable configuration (if requested)
- Complete REST API for the CRUD entity:
  - `GET /api/{entities}` — list all with pagination
  - `GET /api/{entities}/:id` — get one by ID
  - `POST /api/{entities}` — create with input validation
  - `PUT /api/{entities}/:id` — update with input validation
  - `DELETE /api/{entities}/:id` — delete
- Database connection using the specified ORM (or raw queries if no ORM)
- Database model/schema for the CRUD entity
- Migration and seed script (if ORM supports it)
- Dependency file (package.json, requirements.txt, go.mod, etc.) with versions

## Guidelines

- Generate **real, functional code** — not boilerplate stubs
- Use current stable versions for all dependencies
- Backend must validate all inputs and return appropriate HTTP status codes
- Pluralize the entity name for REST routes (e.g., "Item" → "/api/items")

## Standalone Usage

To add a backend to an existing project without the full Constellation flow:

1. Ask the user which framework and language they want
2. Ask for database and ORM preferences
3. Ask for the output directory
4. Ask for CRUD entity details (or skip CRUD if not needed)
5. Generate the backend/ directory following the guidelines above
```

- [ ] **Step 3: Create `plugin/skills/database/SKILL.md`**

```markdown
---
description: Generate or add database configuration, ORM setup, migrations, and seed data to a project
---

# Constellation — Database Generation

Generate database configuration, ORM setup, and seed data for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.database` section), or accept these inputs directly:
- **Database**: PostgreSQL, MySQL, MariaDB, MongoDB, DynamoDB, Firestore
- **ORM/Query Builder**: Prisma, TypeORM, Sequelize, SQLAlchemy, Entity Framework
- **Cache** (optional): Redis, Memcached
- **CRUD entity**: name and fields for schema/model generation

## What You Generate

- Database connection configuration (connection string, pool settings)
- ORM configuration file (prisma/schema.prisma, ormconfig.ts, etc.)
- Entity/model definition matching the CRUD entity fields
- Migration files (initial schema)
- Seed data script
- Docker Compose service for the database (if not already present)
- Environment variable templates for database credentials
- Cache client setup (if Redis/Memcached selected)

## Guidelines

- Generate working connection configs with sensible defaults
- Use environment variables for all credentials
- Include both development and production connection patterns
- Migrations should be runnable immediately

## Standalone Usage

To add database setup to an existing project:

1. Ask which database and ORM the user wants
2. Ask for entity/model details
3. Generate configs, schemas, and migrations
```

- [ ] **Step 4: Create `plugin/skills/infrastructure/SKILL.md`**

```markdown
---
description: Generate or add infrastructure files — Dockerfiles, docker-compose, CI/CD pipelines, and cloud configuration
---

# Constellation — Infrastructure Generation

Generate infrastructure and deployment configuration for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.infrastructure` + `generation.docker` + `generation.ci` sections), or accept these inputs directly:
- **Containerization**: Docker, Podman
- **Orchestration**: Kubernetes, Docker Compose
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI, Jenkins
- **Cloud**: AWS, GCP, Azure, Vercel, Netlify, Render, Railway
- **Docker flags**: compose, buildKit
- **CI flags**: lint, test, build, deploy

## What You Generate

- If containerization is specified:
  - Dockerfile for frontend (multi-stage: deps → build → nginx/serve)
  - Dockerfile for backend (multi-stage: deps → build → minimal runtime)
  - .dockerignore files for both
- If docker-compose is enabled:
  - docker-compose.yml with services for frontend, backend, and database
  - Proper networking, volume mounts, environment variables, health checks
- If CI/CD is specified:
  - Pipeline configuration for the chosen platform
  - Stages according to CI flags (lint, test, build, deploy)
- Cloud-specific deployment configs if applicable

## Guidelines

- Use multi-stage Docker builds for smallest possible images
- Include health checks in docker-compose services
- CI pipelines should cache dependencies
- Use environment variables for all secrets and configuration

## Standalone Usage

To add infrastructure to an existing project:

1. Ask what containerization and CI/CD the user wants
2. Detect existing project structure (frontend/, backend/ directories)
3. Generate Dockerfiles, compose files, and CI pipelines
```

- [ ] **Step 5: Create `plugin/skills/testing/SKILL.md`**

```markdown
---
description: Generate or add testing setup — unit tests, E2E tests, and API test configuration
---

# Constellation — Testing Generation

Generate testing configuration and sample tests for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.testing` section), or accept these inputs directly:
- **Unit testing**: Jest, Vitest, Pytest, xUnit
- **E2E testing**: Cypress, Playwright, Selenium
- **API testing**: Postman Collections, REST Client, Thunder Client

## What You Generate

- Test framework configuration (jest.config.ts, vitest.config.ts, pytest.ini, etc.)
- Sample unit tests for the CRUD entity logic
- E2E test configuration and sample spec
- API test collections/files for the CRUD endpoints
- Test scripts in package.json (or equivalent)
- CI-compatible test commands

## Guidelines

- Tests should be runnable immediately after generation
- Include both passing sample tests and test structure
- E2E tests should cover the main CRUD flow
- API tests should cover all REST endpoints

## Standalone Usage

To add testing to an existing project:

1. Ask which test frameworks the user wants
2. Detect existing project structure and language
3. Generate configs and sample tests
```

- [ ] **Step 6: Create `plugin/skills/monitoring/SKILL.md`**

```markdown
---
description: Generate or add monitoring setup — observability, logging, and error tracking configuration
---

# Constellation — Monitoring Generation

Generate observability, logging, and error tracking configuration for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.monitoring` section), or accept these inputs directly:
- **Observability**: Datadog, New Relic, Grafana, Prometheus
- **Logging**: ELK Stack, Loki, CloudWatch
- **Error tracking**: Sentry, Rollbar

## What You Generate

- SDK/client initialization code for chosen services
- Configuration files (sentry.properties, datadog.yaml, etc.)
- Structured logging setup with appropriate log levels
- Health/metrics endpoint exposure (if Prometheus)
- Docker Compose services for self-hosted tools (Grafana, Prometheus, Loki, ELK)
- Dashboard configuration files (if applicable)
- Environment variable templates for API keys/DSNs

## Guidelines

- Initialize monitoring early in the application lifecycle
- Use structured logging (JSON) for production
- Include both development and production configurations
- Error tracking should capture unhandled exceptions automatically

## Standalone Usage

To add monitoring to an existing project:

1. Ask which monitoring tools the user wants
2. Detect existing framework and language
3. Generate initialization code and configs
```

- [ ] **Step 7: Create `plugin/skills/common/SKILL.md`**

```markdown
---
description: Generate common project files — README, .gitignore, .env.example, Makefile, and setup script
---

# Constellation — Common Files Generation

Generate root-level project files that every project needs.

## What You Generate

- **README.md** — Full documentation: stack overview, prerequisites, setup instructions, API docs, env vars reference, project structure
- **.env.example** — All required environment variables with placeholder values
- **.gitignore** — Comprehensive ignore file covering all selected technologies
- **Makefile** — Common commands: dev, build, test, lint, up, down, clean
- **scripts/setup.sh** — Automated setup script that installs dependencies for all services

## Guidelines

- README should be specific to the actual stack selected, not generic
- .gitignore should cover all selected languages and tools
- Makefile should have targets that work for the specific project structure
- setup.sh should detect the user's OS and install prerequisites

## Standalone Usage

Always generated as part of the Constellation flow. Can also be invoked to regenerate project docs for an existing project.
```

- [ ] **Step 8: Slim down `plugin/skills/generate/SKILL.md` to orchestrator**

Replace the current content with:

```markdown
---
description: Open the visual web UI to select your tech stack, then generate a fully functional project with AI
---

# Constellation — Interactive Project Generator

You are the Constellation project generator. Follow these steps in order.

## Step 1: Launch Web UI and Wait for Blueprint

Run Constellation in interactive mode. This opens the web UI and blocks until the user finishes configuring their stack.

Try these in order until one works:

1. If `constellation` CLI is available:
\`\`\`bash
constellation web --wait 2>/dev/null | tail -1
\`\`\`

2. If the npm package is published:
\`\`\`bash
npx constellation@latest web --wait 2>/dev/null | tail -1
\`\`\`

3. Otherwise, clone and run from source:
\`\`\`bash
CONSTELLATION_DIR="${TMPDIR:-/tmp}/constellation-cli"
if [ ! -d "$CONSTELLATION_DIR" ]; then
  git clone --depth 1 https://github.com/avarajar/constellation.git "$CONSTELLATION_DIR" && cd "$CONSTELLATION_DIR" && npm install --silent
fi
cd "$CONSTELLATION_DIR" && npx tsx src/index.ts web --wait 2>/dev/null | tail -1
\`\`\`

Run whichever command with a 600000ms timeout. The command:
1. Starts the web server at http://localhost:3210
2. Opens the browser automatically
3. Blocks until the user clicks "Send to Claude Code"
4. Outputs the blueprint file path as the last line of stdout
5. Shuts down the server

Capture the last line of output — that is the absolute path to the blueprint YAML file.

## Step 2: Read and Parse the Blueprint

Read the blueprint YAML file from the path captured in Step 1.

Parse and understand every section:
- `project.name`, `project.description`, `project.outputDir`
- `stack.frontend`, `stack.backend`, `stack.database`
- `stack.infrastructure`, `stack.testing`, `stack.monitoring`
- `generation.crudEntity`, `generation.crudFields`, `generation.features`
- `generation.docker`, `generation.ci`
- `github.mode`, `github.org`, `github.repoName`, `github.existingRepo`

Summarize the blueprint briefly, then proceed immediately to generation.

## Step 3: Generate the Project

Create the project directory:
\`\`\`bash
mkdir -p <outputDir>
\`\`\`

For each non-null stack section, spawn a sub-agent using the corresponding Constellation skill. **Run all applicable agents in parallel.**

| Blueprint section | Skill to invoke | Condition |
|---|---|---|
| `stack.frontend` | `constellation:frontend` | `stack.frontend.framework` is not null |
| `stack.backend` | `constellation:backend` | `stack.backend.framework` is not null |
| `stack.database` | `constellation:database` | `stack.database.primary` is not null |
| `stack.infrastructure` | `constellation:infrastructure` | containerization or cicd is not null |
| `stack.testing` | `constellation:testing` | any testing tool is not null |
| `stack.monitoring` | `constellation:monitoring` | any monitoring tool is not null |
| (always) | `constellation:common` | always spawn |

Pass the full blueprint to each sub-agent so it has all context.

## Step 4: Verify

After all agents complete:
- Check that key files exist (package.json or equivalent entry points, main source files)
- If TypeScript, attempt `npx tsc --noEmit` in relevant directories
- Fix any issues found
- Report a brief summary of what was generated

## Step 5: Git + GitHub

Read the `github` section from the blueprint.

If `github.mode` is **"new"**:
\`\`\`bash
cd <outputDir>
git init
git add -A
git commit -m "Initial project scaffolding via Constellation"
\`\`\`
Then ask the user if they want the repo **public or private**, and create it:
\`\`\`bash
gh repo create <org-or-user>/<repoName> --source . --push --private
\`\`\`

If `github.mode` is **"existing"**:
\`\`\`bash
cd <outputDir>
git add -A
git commit -m "Add Constellation-generated project scaffolding"
git push
\`\`\`

If `github.mode` is **"none"**: skip this step.

Report the repo URL if applicable.

## Step 6: Final Summary

Show the user:

> **Project generated successfully!**
>
> - **Name:** (project name)
> - **Path:** (output directory)
> - **Repo:** (repo URL or "local only")
> - **Stack:** (brief summary)
>
> **Next steps:**
> \`\`\`bash
> cd <outputDir>
> # Follow README.md for full setup instructions
> \`\`\`
```

- [ ] **Step 9: Update `commands/constellation.md` — minor reference update**

The command file mostly stays the same since it already references the generate skill flow. Ensure it mentions the skill-based dispatch in step 3. No major changes needed — the command file is the same as the generate skill.

- [ ] **Step 10: Commit**

```bash
cd .tasks/improvements && git add plugin/skills/ commands/ && git commit -m "feat: split monolithic skill into orchestrator + 7 per-category skills"
```

---

## Task 8: Final verification and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run all tests**

Run: `cd .tasks/improvements && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

Run: `cd .tasks/improvements && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `cd .tasks/improvements && npm run lint`
Expected: No errors

- [ ] **Step 4: Test the full web flow end-to-end**

Run: `cd .tasks/improvements && npm run dev -- web`
Verify:
1. Step 1: output dir autocomplete works, browse button opens modal
2. Step 1: no monorepo question visible
3. Step 2: tech cards show dynamically fetched versions
4. Step 2: workspace section appears only when both FE and BE selected
5. Step 3: review shows correct versions

- [ ] **Step 5: Test CLI flow**

Run: `cd .tasks/improvements && npm run dev -- new`
Verify:
1. Monorepo question only asked after tech selection, only if FE+BE selected
2. Labels say "workspace tooling" not "monorepo"

- [ ] **Step 6: Self-review the diff**

Run: `cd .tasks/improvements && git diff improvements~8..improvements --stat`
Review the full diff for any issues.

- [ ] **Step 7: Final commit if any fixes needed**

```bash
cd .tasks/improvements && git add -A && git commit -m "chore: final cleanup and fixes"
```
