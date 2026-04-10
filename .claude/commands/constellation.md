# Constellation — Generate a Project from a Blueprint

Read a Constellation blueprint file and generate a fully functional project.

## Usage

```
/constellation [path-to-blueprint.yml]
```

If no path is given, look for `.constellation/blueprint.yml` in the current directory.

## Process

1. **Read and parse** the blueprint YAML file.
2. **Create the project directory** at the `project.outputDir` path specified in the blueprint.
3. **Generate each layer in parallel** using sub-agents:
   - **Frontend**: Full app with the specified framework, CSS solution, state management, and a sample CRUD UI for the entity defined in `generation.crudEntity`.
   - **Backend**: Server with routes, middleware, CRUD endpoints for the entity, validation, and error handling using the specified framework.
   - **Database**: Schema/model for the CRUD entity with the fields from `generation.crudFields`, migrations, connection setup, and seed data using the specified database and ORM.
   - **Infrastructure**: Dockerfiles (multi-stage if `generation.docker.multiStage`), docker-compose, and CI/CD pipelines matching the `generation.ci` flags.
   - **Testing**: Test configuration files plus sample unit and e2e tests for the CRUD entity, using the specified testing frameworks.
   - **Monitoring**: Error tracking and logging setup for whichever monitoring tools are specified.
4. **Generate common root files**: README.md, .env.example, .gitignore, Makefile, and helper scripts.
5. **Verify** the generated project compiles/builds correctly (run type checking if TypeScript).

## Generation Guidelines

- Use the **exact versions** specified in `stack.*.version` for all dependencies.
- Generate **real, functional code** — not boilerplate stubs. Every endpoint should work end-to-end.
- The CRUD entity name comes from `generation.crudEntity` and the fields from `generation.crudFields`. These drive ALL sample code: the database schema, API routes, frontend components, and tests.
- **Frontend** should have a working UI component that lists, creates, updates, and deletes the CRUD entity.
- **Backend** should have complete REST API routes (`GET /api/items`, `GET /api/items/:id`, `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`) with input validation.
- **Database** should have a proper schema/model matching `generation.crudFields`, with a migration and a seed script.
- **Docker** should use multi-stage builds optimized for production when `generation.docker.multiStage` is true.
- **CI/CD** pipelines should include lint, test, and build stages according to `generation.ci`.
- **README.md** should document the full stack with setup instructions, available scripts, environment variables, and architecture overview.
- **.env.example** should list all required environment variables with placeholder values.
- **.gitignore** should cover node_modules, dist, .env, and any framework-specific ignores.

## Sub-agent Strategy

Spawn these agents in parallel for maximum speed:

1. **frontend-gen** — Generate the `frontend/` (or `src/`) directory with the complete frontend application.
2. **backend-gen** — Generate the `backend/` (or `server/`) directory with the complete backend application.
3. **infra-gen** — Generate infrastructure configs: Dockerfiles, docker-compose.yml, CI/CD workflows.
4. **common-gen** — Generate root-level files: README.md, .env.example, .gitignore, Makefile, package.json (root).

After all agents complete, run a verification step (e.g., `npx tsc --noEmit` for TypeScript projects) to confirm the generated code is valid.

## Blueprint Structure Reference

The blueprint YAML has three top-level sections:

- `project` — name, description, outputDir, mode, monorepo settings
- `stack` — technology choices organized by layer (frontend, backend, database, infrastructure, testing, monitoring)
- `generation` — code generation options: CRUD entity definition, features list, Docker and CI flags

Read all three sections before generating. If a stack slot is `null`, skip that layer entirely.
