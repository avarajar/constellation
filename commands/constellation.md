---
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
description: Interactive project generator — opens a web UI to select your tech stack, then generates a fully functional project with AI
---

# Constellation — Interactive Project Generator

You are the Constellation project generator. Follow these steps in order.

## Step 1: Launch Web UI and Wait for Blueprint

Run Constellation in interactive mode. This opens the web UI and blocks until the user finishes configuring their stack:

```bash
npx @avarajar/constellation@latest web --wait 2>/dev/null | tail -1
```

Run this with a 600000ms timeout. The command:
1. Starts the web server at http://localhost:3210
2. Opens the browser automatically
3. Blocks until the user clicks "Send to Claude Code"
4. Outputs the blueprint file path as the last line of stdout
5. Shuts down the server

Capture the last line of output — that is the absolute path to the blueprint YAML file.

## Step 2: Read and Parse the Blueprint

Read the blueprint YAML file from the path captured in Step 1.

Parse and understand every section:
- `project.name` — the project name
- `project.description` — project description
- `project.outputDir` — where to generate the project
- `stack.frontend` — frontend framework, CSS, build tool, state management
- `stack.backend` — backend framework, language, runtime
- `stack.database` — primary database, ORM, cache
- `stack.infrastructure` — containerization, orchestration, CI/CD, cloud
- `stack.testing` — unit, e2e, API testing frameworks
- `stack.monitoring` — observability, logging, error tracking
- `generation.crudEntity` — the CRUD entity name (e.g. "Item")
- `generation.crudFields` — the fields for the CRUD entity
- `generation.features` — enabled features (cors, healthCheck, etc.)
- `generation.docker` — Docker configuration flags
- `generation.ci` — CI/CD pipeline flags
- `github.mode` — "new", "existing", or "none"
- `github.org` — GitHub org (if applicable)
- `github.repoName` — repo name for new repos
- `github.existingRepo` — repo URL for existing repos

Summarize the blueprint briefly, then proceed immediately to generation.

## Step 3: Generate the Project

Create the project directory and generate each layer using sub-agents in parallel.

```bash
mkdir -p <outputDir>
```

Read the blueprint values carefully. For each non-null stack section, spawn a sub-agent. **Run all applicable agents in parallel.**

### Agent: frontend-gen

Only spawn if `stack.frontend.framework` is not null.

Generate the `frontend/` directory with a complete, working frontend application:
- Project scaffolding for the specified framework (React, Vue, Svelte, Angular, etc.)
- CSS solution integration (Tailwind, Styled Components, CSS Modules, etc.)
- State management setup (Zustand, Redux, Pinia, Jotai, etc.)
- Build tool configuration (Vite, Webpack, esbuild, etc.)
- A fully working CRUD UI for the entity from `generation.crudEntity` with all fields from `generation.crudFields`:
  - List view with all items
  - Create form with validation
  - Edit form
  - Delete confirmation
- TypeScript configuration (if language is typescript)
- package.json with exact dependency versions
- index.html, main entry point, App component
- Router setup if the framework supports it
- API service layer that calls the backend REST endpoints

### Agent: backend-gen

Only spawn if `stack.backend.framework` is not null.

Generate the `backend/` directory with a complete, working backend application:
- Server setup with the specified framework (Fastify, Express, Hono, Django, Flask, Gin, Echo, etc.)
- The correct language and runtime from `stack.backend.language` and `stack.backend.runtime`
- CORS middleware (if "cors" in `generation.features`)
- Health check endpoint at GET /health (if "healthCheck" in `generation.features`)
- Error handling middleware (if "errorHandling" in `generation.features`)
- Environment variable configuration (if "envConfig" in `generation.features`)
- Complete REST API for the CRUD entity:
  - `GET /api/{entities}` — list all with pagination
  - `GET /api/{entities}/:id` — get one by ID
  - `POST /api/{entities}` — create with input validation
  - `PUT /api/{entities}/:id` — update with input validation
  - `DELETE /api/{entities}/:id` — delete
- Database connection using the ORM from `stack.database.orm` (if specified), or raw queries if no ORM
- Database model/schema for the CRUD entity matching `generation.crudFields`
- Migration and seed script (if ORM supports it)
- Dependency file (package.json, requirements.txt, go.mod, etc.) with exact versions

### Agent: infra-gen

Only spawn if `stack.infrastructure.containerization` is not null or `stack.infrastructure.cicd` is not null.

Generate infrastructure files:
- If containerization is specified:
  - Dockerfile for frontend (multi-stage build: install deps, build, copy to nginx/serve)
  - Dockerfile for backend (multi-stage build: install deps, build, minimal runtime image)
  - .dockerignore files for both
- If `generation.docker.compose` is true:
  - docker-compose.yml with services for frontend, backend, and database
  - Proper networking, volume mounts, environment variables, health checks
- If `stack.infrastructure.cicd` is not null:
  - CI/CD pipeline configuration (GitHub Actions, GitLab CI, etc.)
  - Include stages according to `generation.ci` flags

### Agent: common-gen

Always spawn this agent. Generate root-level project files:
- **README.md** — Full documentation: stack overview, prerequisites, setup instructions, API docs, env vars reference, project structure
- **.env.example** — All required environment variables with placeholder values
- **.gitignore** — Comprehensive ignore file covering all selected technologies
- **Makefile** — Common commands: dev, build, test, lint, up, down, clean
- **scripts/setup.sh** — Automated setup script that installs dependencies for all services

## Step 4: Verify

After all agents complete:
- Check that key files exist (package.json or equivalent entry points, main source files)
- If TypeScript, attempt `npx tsc --noEmit` in relevant directories
- Fix any issues found
- Report a brief summary of what was generated

## Step 5: Git + GitHub

Read the `github` section from the blueprint.

If `github.mode` is **"new"**:
```bash
cd <outputDir>
git init
git add -A
git commit -m "Initial project scaffolding via Constellation"
```
Then ask the user if they want the repo **public or private**, and create it:
```bash
gh repo create <org-or-user>/<repoName> --source . --push --private
```

If `github.mode` is **"existing"**:
```bash
cd <outputDir>
git add -A
git commit -m "Add Constellation-generated project scaffolding"
git push
```

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
> ```bash
> cd <outputDir>
> # Follow README.md for full setup instructions
> ```

## Generation Guidelines

These rules apply to ALL sub-agents:

- Generate **real, functional code** — not boilerplate stubs. Every endpoint, component, and configuration should work end-to-end.
- Use the **exact versions** from the blueprint for all dependencies.
- The CRUD entity name comes from `generation.crudEntity` and the fields from `generation.crudFields`. These drive ALL generated code.
- Pluralize the entity name for REST routes (e.g., "Item" becomes "/api/items").
- All code must be properly formatted with consistent style.
- Include appropriate error handling everywhere.
- Frontend must connect to the backend API with proper error states and loading indicators.
- Backend must validate all inputs and return appropriate HTTP status codes.
- If a stack slot is null, skip that layer entirely — do not generate placeholder files.
