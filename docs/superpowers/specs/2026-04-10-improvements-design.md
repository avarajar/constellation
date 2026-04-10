# Constellation Improvements Design

**Date:** 2026-04-10
**Author:** Jose Andrade

## Overview

Four improvements to the Constellation project generator to address outdated versions, UX friction in directory selection, confusing monorepo semantics, and a monolithic skill/command structure.

---

## 1. Dynamic Version Fetching

### Problem
Technology versions in YAML files are hardcoded and go stale (e.g., Django shows 5.1.0 when 6.x is current).

### Solution
Fetch latest versions from package registries (npm, PyPI, crates.io) at server startup. Cache in memory. YAML versions become optional fallbacks.

### Changes

**YAML files (`src/registry/technologies/*.yml`):**
- Make `version` optional (fallback only)
- Add `package` field — the registry package name (e.g., `package: "express"`, `package: "django"`)
- Add `ecosystem` field — `npm`, `pypi`, `crates`, `maven`, `nuget`, `go` (can be inferred from `language` as default)

**Types (`src/core/types.ts`):**
- `version` becomes `version?: string`
- Add `package?: string` and `ecosystem?: string` to `Technology`

**Registry (`src/registry/index.ts`):**
- Add `fetchLatestVersions()` — iterates all technologies, groups by ecosystem, batch-fetches latest versions from registries
- Versions cached in memory with 30-minute TTL
- On failure, falls back to YAML `version` or displays "latest"
- Reuse existing npm/pypi/crates fetch logic from `api.ts` (extract to shared module)

**API (`src/web/api.ts`):**
- `handleGetTechnologies()` returns version-enriched data
- Extract `searchNpm`, `searchPypi`, `searchCrates` to a shared `src/registry/versions.ts` module

### Ecosystem inference from language
- `typescript` / `javascript` → `npm`
- `python` → `pypi`
- `rust` → `crates`
- `go` → `go` (use `proxy.golang.org`)
- `java` → `maven` (use `search.maven.org`)
- `csharp` → `nuget` (use `api.nuget.org`)
- Explicit `ecosystem` field overrides inference

### Fallback chain
1. Cached fetched version (if fresh)
2. YAML `version` field (if present)
3. `"latest"` string

---

## 2. Directory Picker (Autocomplete + Browse)

### Problem
Output directory is a plain text input. Users must type the full path manually.

### Solution
Add path autocomplete on the text input, plus a "Browse" button that opens a folder navigator modal.

### Changes

**Backend — new API endpoint:**
- `GET /api/browse-dirs?path=/some/path` → `{ dirs: string[], parent: string | null }`
- Lists subdirectories at the given path
- Filters out hidden directories (`.`, `..`, `.git`, `node_modules`, etc.)
- Returns only directories, not files
- Returns `parent` for navigation up

**Frontend — autocomplete:**
- Debounced input handler on the output dir field
- On each keystroke (debounced 300ms), calls `/api/browse-dirs?path=<current-value>`
- Renders a dropdown below the input with matching directory suggestions
- Tab or click fills the input and fetches next level
- Escape closes the dropdown

**Frontend — browse modal:**
- "Browse" button next to the output dir input
- Modal with:
  - Breadcrumb bar showing current path segments (clickable for navigation)
  - List of subdirectories (clickable to navigate into)
  - "New folder" button (calls `POST /api/create-dir`)
  - "Select this folder" button to confirm
- Starts at current `outputDir` value or `~/projects`

**Backend — create directory endpoint:**
- `POST /api/create-dir` body: `{ path: string }` → `{ success: boolean, path: string }`
- Creates the directory (recursive) if it doesn't exist

**Files affected:**
- `src/web/api.ts` — add `handleBrowseDirs()`, `handleCreateDir()`
- `src/web/server.ts` — register new routes
- `src/web/public/app.js` — autocomplete logic, browse modal rendering
- `src/web/public/styles.css` — autocomplete dropdown, browse modal styles
- `src/web/public/index.html` — browse modal template

---

## 3. Smarter Monorepo / Workspace Question

### Problem
The monorepo question appears in step 1 before the user has selected technologies, and the label is confusing — users don't know what happens if they say "No."

### Solution
Move the question to step 2 (after tech selection), only show it when both frontend and backend are selected, and relabel it.

### Changes

**Move from step 1 to step 2:**
- Remove the monorepo toggle and tool selector from the step 1 template
- Add a "Project Structure" section at the bottom of step 2, after tech selection
- Only render this section if the user has selected at least one frontend AND at least one backend technology

**Relabel:**
- "Set up as monorepo?" → "Add workspace tooling?"
- Hint text: "Adds Turborepo or Nx to orchestrate builds across frontend and backend packages"
- Tool choices remain: Turborepo, Nx, None (manual workspaces)

**When "No" (no workspace tooling):**
- Project still generates `frontend/` and `backend/` directories in one repo
- No `turbo.json`, `nx.json`, or root workspace `package.json`
- Simple, flat structure

**When "Yes":**
- Adds workspace configuration (turbo.json or nx.json)
- Root `package.json` with workspaces
- Shared tsconfig if applicable

**Infrastructure is NOT a factor:**
- Infrastructure files (Docker, CI/CD, Terraform) sit at `infra/` or root level
- They are not workspace packages — no build orchestration needed
- Monorepo question only considers frontend + backend

**CLI (`src/cli/prompts.ts`):**
- Move monorepo question to after tech selection loop
- Same conditional: only ask if frontend + backend selected

**Files affected:**
- `src/web/public/app.js` — move monorepo UI, add conditional rendering
- `src/web/public/index.html` — move template section
- `src/web/public/styles.css` — minor adjustments
- `src/cli/prompts.ts` — reorder prompts

---

## 4. Split Skills by Category

### Problem
One monolithic `SKILL.md` (212 lines) handles all generation layers. Hard to maintain, can't use individual layers independently.

### Solution
Split into an orchestrator skill plus per-category generation skills. Each can be used standalone.

### New plugin structure

```
plugin/skills/
  generate/SKILL.md        ← orchestrator
  frontend/SKILL.md        ← frontend layer generation
  backend/SKILL.md         ← backend layer generation
  database/SKILL.md        ← database/ORM/cache layer
  infrastructure/SKILL.md  ← Docker, CI/CD, cloud
  testing/SKILL.md         ← test frameworks setup
  monitoring/SKILL.md      ← observability, logging, error tracking
  common/SKILL.md          ← README, .gitignore, .env.example, Makefile, setup.sh
```

### Orchestrator (`generate/SKILL.md`)
- Step 1: Launch web UI, wait for blueprint (unchanged)
- Step 2: Parse blueprint (unchanged)
- Step 3: For each non-null stack section, invoke the corresponding category skill as a sub-agent in parallel
- Step 4: Verify generated files (unchanged)
- Step 5: Git + GitHub (unchanged)
- Step 6: Final summary (unchanged)

### Category skills (each one)
- Description of what it generates
- Framework-specific instructions and patterns
- Blueprint section it reads from (e.g., `stack.frontend`)
- Standalone usage: "To add a frontend to an existing project, provide: framework, CSS solution, state management, build tool, and CRUD entity details"
- Generation guidelines (real code, exact versions, proper error handling)

### Command
- `commands/constellation.md` stays as single entry point
- References the `generate` orchestrator skill
- `.claude/commands/constellation.md` kept in sync

### Files affected
- `plugin/skills/generate/SKILL.md` — slim down to orchestrator
- `plugin/skills/{frontend,backend,database,infrastructure,testing,monitoring,common}/SKILL.md` — new, extracted from current skill
- `commands/constellation.md` — minor reference update

---

## Out of Scope

- Changing the 6-category group structure
- Adding new technologies to the registry
- Modifying generators (`src/generators/`)
- Changing the blueprint YAML format
- Modifying the pipeline architecture
