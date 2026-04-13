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
- **Package manager**: npm, yarn, pnpm, bun
- **CRUD entity**: name and fields for the sample CRUD UI

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP. DO NOT USE VERSIONS FROM YOUR TRAINING DATA.**

```bash
for pkg in react react-dom vue svelte next nuxt astro @angular/core solid-js tailwindcss vite webpack esbuild @reduxjs/toolkit zustand jotai pinia axios typescript eslint prettier; do
  ver=$(npm view "$pkg" version 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg@$ver"
done
```

Run only the ones relevant to the selected stack. **Write down every version. Use ONLY those in package.json.**

## What You Generate

### Core Application
- Project scaffolding for the specified framework
- CSS solution integration
- State management setup
- Build tool configuration
- A fully working CRUD UI for the specified entity:
  - List view with all items (table or card grid)
  - Create form with validation
  - Edit form (pre-filled)
  - Delete confirmation dialog
  - Loading states and error handling
- TypeScript configuration (if applicable)
- package.json with the exact versions fetched in Step 0
- index.html, main entry point, App component
- Router setup if the framework supports it
- API service layer that calls the backend REST endpoints (with axios or fetch)

### Linting & Formatting
- **ESLint** configuration:
  - `eslint.config.js` (flat config) or `.eslintrc.cjs`
  - Framework-specific plugins: eslint-plugin-react, eslint-plugin-vue, etc.
  - TypeScript parser: @typescript-eslint
- **Prettier** configuration:
  - `.prettierrc` with sensible defaults (singleQuote, semi, trailingComma)
  - `.prettierignore`
- **Biome** as alternative if selected (single tool for lint + format):
  - `biome.json` configuration
- Lint script: `"lint": "eslint src/"` or `"lint": "biome lint src/"`
- Format script: `"format": "prettier --write src/"` or `"format": "biome format --write src/"`
- Lint + fix script: `"lint:fix": "eslint src/ --fix"`

### Pre-commit Hooks
- **husky** + **lint-staged**:
  ```json
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
  ```
- `prepare` script in package.json: `"prepare": "husky"`
- `.husky/pre-commit` hook file

### Component Structure
- Organized directory structure:
  ```
  src/
    components/     # Reusable UI components
    pages/          # Route pages (or views/)
    services/       # API service layer
    store/          # State management
    hooks/          # Custom hooks (React) or composables (Vue)
    types/          # TypeScript type definitions
    utils/          # Utility functions
  ```

### Dev Scripts (adapt commands to selected package manager)
Use the selected package manager for ALL commands. Examples with each:
- **npm**: `npm run dev`, `npm run build`, `npm test`
- **yarn**: `yarn dev`, `yarn build`, `yarn test`
- **pnpm**: `pnpm dev`, `pnpm build`, `pnpm test`
- **bun**: `bun run dev`, `bun run build`, `bun test`

Scripts to include:
- `dev` — Start dev server with hot reload
- `build` — Production build
- `preview` — Preview production build locally
- `lint` — Run linter
- `lint:fix` — Auto-fix lint issues
- `format` — Format code
- `type-check` — TypeScript type checking (if TS)

## Guidelines

- Generate **real, functional code** — not boilerplate stubs
- **Use ONLY the versions you fetched in Step 0.** Never guess or use memorized versions.
- All code must be properly formatted with consistent style
- Include appropriate error handling
- Frontend must connect to the backend API with proper error states and loading indicators
- The CRUD entity name and fields drive ALL generated code
- Pluralize the entity name for REST routes (e.g., "Item" → "/api/items")
- The app must start and run with `npm run dev` out of the box

## Standalone Usage

To add a frontend to an existing project without the full Constellation flow:

1. Ask the user which framework, CSS, state management, and build tool they want
2. Ask for the output directory
3. Ask for CRUD entity details (or skip CRUD if not needed)
4. **Run Step 0 to fetch latest versions**
5. Generate the frontend/ directory following the guidelines above
