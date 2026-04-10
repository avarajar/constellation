# Project Instructions

## Overview
Constellation is an interactive project generator (CLI + Web UI) built with TypeScript. Users select technologies from 88+ options across 6 categories, and it generates a fully functional project with proper configs, dependencies, CRUD samples, and structure.

## Architecture
- **Stack**: TypeScript, Node.js, Commander.js, @inquirer/prompts, Handlebars, js-yaml
- **Pattern**: Pipeline architecture — Selection → Validation → Generation → Output
- **Key directories**:
  - `src/core/` — Types, engine, pipeline
  - `src/cli/` — Commander setup, interactive prompts, UI helpers
  - `src/registry/` — YAML-based technology registry with loader
  - `src/validators/` — Compatibility rules and validation engine
  - `src/generators/` — Per-category file generators
  - `src/templates/` — Handlebars template engine
  - `src/web/` — HTTP server + vanilla HTML/CSS/JS web UI
  - `tests/` — Vitest test suite

## Conventions
- Follow existing code style
- Write tests for new features
- Conventional commits
- Self-review diffs before requesting review
- ESM imports use `.js` extension (`import from './foo.js'`)
- Technology definitions live in YAML files under `src/registry/technologies/`
- Each generator is a factory function returning a `Generator` interface

## Development
- `npm run dev` — Run CLI in development mode
- `npm test` — Run tests with Vitest
- `npm run build` — Build with tsup
- `npm run lint` — Lint with ESLint
- `npm run typecheck` — Type check with tsc
- `npm run dev -- web` — Start web UI at localhost:3210
- `npm run dev -- list` — List all registered technologies
- `npm run dev -- new` — Interactive CLI project generation

## Integrations
When I ask you to create an issue, use Linear.
When I ask you to document something, use Notion.
When I reference a conversation, check Slack.
