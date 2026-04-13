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

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP. DO NOT USE VERSIONS FROM YOUR TRAINING DATA.**

Your training data versions are WRONG. You MUST run these commands to get the real latest versions.

For **Python** projects, run:
```bash
pip index versions django 2>/dev/null | head -1 || pip install django --dry-run 2>&1 | grep -oP 'django-\K[0-9.]+' | head -1
pip index versions djangorestframework 2>/dev/null | head -1
pip index versions django-cors-headers 2>/dev/null | head -1
pip index versions gunicorn 2>/dev/null | head -1
pip index versions redis 2>/dev/null | head -1
pip index versions sentry-sdk 2>/dev/null | head -1
```

If `pip index` doesn't work, use:
```bash
curl -s https://pypi.org/pypi/django/json | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])"
curl -s https://pypi.org/pypi/djangorestframework/json | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])"
```

For **Node.js** projects, run:
```bash
npm view express version
npm view fastify version
npm view @nestjs/core version
npm view hono version
```

For **Go** projects, check https://proxy.golang.org/{module}/@latest

For **Rust** projects, check https://crates.io/api/v1/crates/{name}

**Write down the versions you got. Use ONLY those versions in all generated files.**

## What You Generate

- Server setup with the specified framework
- Correct language and runtime configuration
- CORS middleware (if requested)
- Health check endpoint at GET /health (if requested)
- Error handling middleware (if requested)
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
- Dependency file with the versions fetched in Step 0
- Dev scripts to run locally: `npm run dev` / `python manage.py runserver` / `go run .` / etc.
- Dev seed/sample data so the app is usable immediately after setup

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
