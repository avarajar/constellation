---
description: Generate or add a backend layer to a project — server framework, REST API, database connection, and CRUD endpoints
---

# Constellation — Backend Generation

Generate the `backend/` directory with a complete, working backend application.

## What You Need

Either read from a Constellation blueprint YAML (`stack.backend` + `stack.database` sections), or accept these inputs directly:
- **Framework**: Express, Fastify, Hono, NestJS, Elysia, Django, Flask, FastAPI, Starlette, Gin, Echo, Chi, Actix, Axum, Rocket, Spring Boot, Quarkus, ASP.NET Core
- **Language/Runtime**: TypeScript/Node.js, Python, Go, Rust, Java, C#
- **Package Manager**:
  - **Python**: pip (requirements.txt), uv (uv.lock + pyproject.toml), poetry (pyproject.toml + poetry.lock), pipenv (Pipfile + Pipfile.lock)
  - **Node.js**: npm (package-lock.json), yarn (yarn.lock), pnpm (pnpm-lock.yaml), bun (bun.lockb)
  - **Go**: go modules (go.mod) — no alternatives
  - **Rust**: cargo (Cargo.lock) — no alternatives
  - **Java**: Maven (pom.xml), Gradle (build.gradle)
- **Database + ORM** (optional): PostgreSQL/MySQL/MongoDB + Prisma/TypeORM/SQLAlchemy/etc.
- **CRUD entity**: name and fields for the sample REST API
- **Features**: CORS, health check, error handling, env config

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP. DO NOT USE VERSIONS FROM YOUR TRAINING DATA.**

For **Python** projects:
```bash
for pkg in django djangorestframework django-cors-headers gunicorn redis sentry-sdk flask fastapi uvicorn sqlalchemy ruff black; do
  ver=$(curl -s "https://pypi.org/pypi/$pkg/json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])" 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg==$ver"
done
```

For **Node.js** projects:
```bash
for pkg in express fastify hono @nestjs/core elysia eslint prettier typescript; do
  ver=$(npm view "$pkg" version 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg@$ver"
done
```

**Write down the versions. Use ONLY those in all generated files.**

## What You Generate

### Core Application
- Server setup with the specified framework
- Correct language and runtime configuration
- CORS middleware (if requested)
- Health check endpoint at GET /health (if requested)
- Error handling middleware with proper error responses (if requested)
- Environment variable configuration with `.env` support (if requested)
- Complete REST API for the CRUD entity:
  - `GET /api/{entities}` — list all with pagination
  - `GET /api/{entities}/:id` — get one by ID
  - `POST /api/{entities}` — create with input validation
  - `PUT /api/{entities}/:id` — update with input validation
  - `DELETE /api/{entities}/:id` — delete
- Database connection using the specified ORM (or raw queries if no ORM)
- Database model/schema for the CRUD entity
- Migration and seed script (if ORM supports it)
- Dev seed/sample data so the app is usable immediately after setup

### API Documentation
- Auto-generated API docs:
  - **Python (FastAPI)**: built-in Swagger at `/docs`
  - **Python (Django)**: drf-spectacular or drf-yasg for OpenAPI
  - **Node.js**: swagger-jsdoc + swagger-ui-express or @nestjs/swagger
  - **Go**: swaggo/swag annotations
- OpenAPI/Swagger spec file if not auto-generated

### Linting & Formatting
- **Python**: Ruff for linting + formatting (replaces flake8, isort, black). Include `ruff.toml` or `[tool.ruff]` in `pyproject.toml`:
  ```toml
  [tool.ruff]
  line-length = 120
  target-version = "py312"
  [tool.ruff.lint]
  select = ["E", "F", "I", "N", "W", "UP"]
  ```
- **Node.js/TypeScript**: ESLint + Prettier. Include `.eslintrc.cjs` or `eslint.config.js` and `.prettierrc`
- **Go**: `golangci-lint` with `.golangci.yml`
- **Rust**: `clippy` (built-in) + `rustfmt.toml`
- Lint script in the dependency file: `"lint": "ruff check ."` or `"lint": "eslint src/"`
- Format script: `"format": "ruff format ."` or `"format": "prettier --write ."`

### Pre-commit Hooks
- **Python**: `.pre-commit-config.yaml` with:
  - ruff (lint + format)
  - check-yaml, check-json, trailing-whitespace
  - detect-secrets
- **Node.js**: `husky` + `lint-staged` in package.json:
  ```json
  "lint-staged": { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }
  ```
  Plus `npx husky init` setup script
- **Go**: pre-commit with golangci-lint hook
- Include instructions in README to install pre-commit hooks

### Auth Structure (if applicable)
- Basic JWT or session-based auth middleware skeleton:
  - Auth middleware that checks tokens
  - Login/register endpoint stubs
  - User model
  - Token generation utility
- Not fully implemented — just the structure so it's easy to extend

### Rate Limiting
- Basic rate limiting middleware:
  - **Python**: django-ratelimit or slowapi (FastAPI)
  - **Node.js**: express-rate-limit or @nestjs/throttler
- Applied to auth and write endpoints

### Structured Logging
- JSON-formatted logging for production:
  - **Python**: `structlog` or `python-json-logger`
  - **Node.js**: `pino` or `winston`
  - **Go**: `zerolog` or `zap`
- Log levels: debug, info, warning, error
- Request/response logging middleware

### Dependency File (use the selected package manager)

**Python:**
- **pip**: `requirements.txt` + `requirements-dev.txt` with pinned versions from Step 0
- **uv**: `pyproject.toml` with `[project.dependencies]` + `uv.lock`. Use `uv run`, `uv sync`, `uv add` commands in scripts.
- **poetry**: `pyproject.toml` with `[tool.poetry.dependencies]` + `poetry.lock`. Use `poetry run`, `poetry install`, `poetry add` commands.
- **pipenv**: `Pipfile` + `Pipfile.lock`. Use `pipenv run`, `pipenv install` commands.

**Node.js:**
- **npm**: `package.json` + `package-lock.json`. Use `npm run`, `npm install` commands.
- **yarn**: `package.json` + `yarn.lock`. Use `yarn`, `yarn add` commands.
- **pnpm**: `package.json` + `pnpm-lock.yaml`. Use `pnpm run`, `pnpm add` commands. Include `.npmrc` with `shamefully-hoist=true` if needed.
- **bun**: `package.json` + `bun.lockb`. Use `bun run`, `bun add` commands.

**All:** include dev scripts for run, lint, format, test. Adapt all Makefile/script commands to use the selected package manager (e.g., `pnpm run dev` instead of `npm run dev`).

## Guidelines

- Generate **real, functional code** — not boilerplate stubs
- **Use ONLY the versions you fetched in Step 0.** Never guess or use memorized versions.
- Backend must validate all inputs and return appropriate HTTP status codes
- Pluralize the entity name for REST routes
- The app must start and run locally out of the box with a single command
- Include a `README.md` with setup and run instructions specific to this backend

## Standalone Usage

To add a backend to an existing project:

1. Ask the user which framework and language they want
2. Ask for database and ORM preferences
3. Ask for the output directory
4. Ask for CRUD entity details (or skip CRUD if not needed)
5. **Run Step 0 to fetch latest versions**
6. Generate the backend/ directory following the guidelines above
