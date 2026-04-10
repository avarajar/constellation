---
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
description: Interactive project generator — opens a web UI to select your tech stack, then generates a fully functional project with AI
---

# Constellation — Interactive Project Generator

You are the Constellation project generator. Follow these steps in order.

## Step 1: Launch the Web UI

Start the Constellation web server in the background and open the browser:

```bash
cd /Users/joselito/Workspace/constellation && npx tsx src/index.ts web &
sleep 2
open http://localhost:3210
```

Tell the user:

> **Constellation is open in your browser at http://localhost:3210**
>
> Select your technologies and configure your project. When you're done, click **"Generate Blueprint for Claude Code"** — then come back here and tell me you're ready.

Now **stop and wait** for the user to respond. Do not proceed until they confirm (they'll say something like "done", "ready", "listo", "ok", etc.).

## Step 2: Read the Blueprint

After the user confirms, find the most recent blueprint file:

```bash
find /tmp -name "blueprint.yml" -path "*/.constellation/*" 2>/dev/null -exec ls -t {} + | head -1
```

If nothing is found in /tmp, search the user's home directory:

```bash
find ~/Projects ~/projects ~/workspace ~/Workspace ~/Desktop -name "blueprint.yml" -path "*/.constellation/*" 2>/dev/null -exec ls -t {} + | head -5
```

If still not found, ask the user for the blueprint path.

Once found, read the blueprint YAML file using the Read tool.

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

Summarize the blueprint to the user so they can confirm it looks correct.

## Step 3: GitHub Setup

Ask the user:

> **GitHub Repository Setup**
>
> How would you like to set up the GitHub repo?
> 1. **New repo** — I'll create it for you
> 2. **Existing repo** — I'll clone it and add the generated code
> 3. **No repo** — Just generate locally

**Wait for the user to choose.**

If they choose **new repo**:
- Run `gh auth status` to verify GitHub CLI is authenticated.
- Run `gh org list` to show available organizations.
- Ask which org (or personal account) they want the repo under.
- Remember their choice for Step 6.

If they choose **existing repo**:
- Ask for the repo URL or let them search: `gh repo list <org> --json name,url -q '.[].name' | head -20`
- Clone the repo to the output directory: `git clone <repo-url> <outputDir>`

If they choose **no repo**: just proceed to generation.

## Step 4: Generate the Project

This is the main event. Create the project directory structure and generate each layer using sub-agents in parallel.

First, create the output directory:

```bash
mkdir -p <outputDir>
```

Read the blueprint values carefully. For each non-null stack section, spawn a sub-agent. **Run all applicable agents in parallel.**

### Agent: frontend-gen

Only spawn this agent if `stack.frontend.framework` is not null.

Generate the `frontend/` directory. The agent must create a complete, working frontend application:
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

Only spawn this agent if `stack.backend.framework` is not null.

Generate the `backend/` directory. The agent must create a complete, working backend application:
- Server setup with the specified framework (Fastify, Express, Hono, Django, Flask, Gin, Echo, etc.)
- The correct language and runtime from `stack.backend.language` and `stack.backend.runtime`
- CORS middleware (if "cors" in `generation.features`)
- Health check endpoint at GET /health (if "healthCheck" in `generation.features`)
- Error handling middleware (if "errorHandling" in `generation.features`)
- Environment variable configuration (if "envConfig" in `generation.features`)
- Complete REST API for the CRUD entity using the entity name and fields from the blueprint:
  - `GET /api/{entities}` — list all with pagination
  - `GET /api/{entities}/:id` — get one by ID
  - `POST /api/{entities}` — create with input validation
  - `PUT /api/{entities}/:id` — update with input validation
  - `DELETE /api/{entities}/:id` — delete
- Database connection using the ORM from `stack.database.orm` (if specified)
- Database model/schema for the CRUD entity matching `generation.crudFields`
- Migration and seed script (if ORM supports it)
- Dependency file (package.json, requirements.txt, go.mod, etc.) with exact versions

### Agent: infra-gen

Only spawn this agent if `stack.infrastructure.containerization` is not null or `stack.infrastructure.cicd` is not null.

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
  - Include lint stage if `generation.ci.lint` is true
  - Include test stage if `generation.ci.test` is true
  - Include build stage if `generation.ci.build` is true
  - Include deploy stage if `generation.ci.deploy` is true

### Agent: common-gen

Always spawn this agent. Generate root-level project files:
- **README.md** — Full documentation including:
  - Project name and description
  - Stack overview (all selected technologies)
  - Prerequisites
  - Setup instructions (step by step)
  - Available scripts and commands
  - API endpoint documentation
  - Environment variables reference
  - Project structure overview
- **.env.example** — All required environment variables with placeholder values (database URL, ports, API keys, etc.)
- **.gitignore** — Comprehensive ignore file covering all selected technologies (node_modules, dist, .env, __pycache__, target/, etc.)
- **Makefile** — Common commands: dev, build, test, lint, up, down, clean
- **scripts/setup.sh** — Automated setup script that installs dependencies for all services

## Step 5: Verify

After all agents complete, run verification:
- Check that key files exist (package.json or equivalent entry points, main source files)
- If it is a TypeScript project, attempt type checking: `npx tsc --noEmit` in the relevant directories
- If any issues are found, fix them
- Report a summary of what was generated to the user (number of files, directory structure overview)

## Step 6: Git + Push

If the user chose a GitHub option in Step 3:

For **new repo**:
```bash
cd <outputDir>
git init
git add -A
git commit -m "Initial project scaffolding via Constellation"
gh repo create <org>/<project-name> --source . --push --private
```
Ask the user if they want the repo public or private before creating it.

For **existing repo**:
```bash
cd <outputDir>
git add -A
git commit -m "Add Constellation-generated project scaffolding"
git push
```

Report the repo URL to the user.

If the user chose **no repo**, skip this step.

## Step 7: Cleanup

Stop the web server:

```bash
pkill -f "tsx src/index.ts web" 2>/dev/null || true
```

Show the user a final summary:

> **Project generated successfully!**
>
> - **Name:** (the project name)
> - **Path:** (the output directory)
> - **Repo:** (the repo URL, or "local only")
> - **Stack:** (brief summary of selected technologies)
>
> **Next steps:**
> ```bash
> cd <outputDir>
> # Follow the README.md for full setup instructions
> ```

## Generation Guidelines

These rules apply to ALL sub-agents:

- Generate **real, functional code** — not boilerplate stubs. Every endpoint, component, and configuration should work end-to-end.
- Use the **exact versions** from the blueprint for all dependencies.
- The CRUD entity name comes from `generation.crudEntity` and the fields from `generation.crudFields`. These drive ALL generated code: database schemas, API routes, frontend components, and tests.
- Pluralize the entity name for REST routes (e.g., "Item" becomes "/api/items").
- All code must be properly formatted, with consistent style.
- Include appropriate error handling everywhere.
- Frontend must connect to the backend API with proper error states and loading indicators.
- Backend must validate all inputs and return appropriate HTTP status codes.
- If `stack.database.orm` is null but `stack.database.primary` is not null, use raw queries or the database's native driver.
- If a stack slot is null, skip that layer entirely — do not generate placeholder files for unused technologies.
