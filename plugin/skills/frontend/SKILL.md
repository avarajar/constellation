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
