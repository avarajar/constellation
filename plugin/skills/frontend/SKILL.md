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

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP. DO NOT USE VERSIONS FROM YOUR TRAINING DATA.**

Run these commands to get real latest versions for ALL dependencies you will use:

```bash
npm view react version
npm view react-dom version
npm view vue version
npm view svelte version
npm view next version
npm view nuxt version
npm view astro version
npm view @angular/core version
npm view solid-js version
npm view tailwindcss version
npm view vite version
npm view @reduxjs/toolkit version
npm view zustand version
npm view jotai version
npm view pinia version
npm view typescript version
```

Run only the ones relevant to the selected stack. **Write down every version. Use ONLY those versions in package.json.**

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
- package.json with the exact versions fetched in Step 0
- index.html, main entry point, App component
- Router setup if the framework supports it
- API service layer that calls the backend REST endpoints
- Dev scripts: `npm run dev`, `npm run build`, `npm run preview`

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
