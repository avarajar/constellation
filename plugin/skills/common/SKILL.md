---
description: Generate common project files — README, .gitignore, .env.example, Makefile, setup scripts, and local dev configuration
---

# Constellation — Common Files Generation

Generate root-level project files that every project needs.

## What You Generate

- **README.md** — Full documentation:
  - Project name and description
  - Tech stack overview (every selected technology)
  - Prerequisites (Node.js, Python, Docker, etc.)
  - Quick start: how to run locally in 3 steps or less
  - Full setup instructions
  - API documentation with all endpoints
  - Environment variables reference table
  - Project structure tree
  - Available scripts/commands reference
  - Deployment instructions

- **.env.example** — All required environment variables with placeholder values and comments explaining each

- **.gitignore** — Comprehensive ignore file covering all selected technologies (node_modules, __pycache__, .env, dist, build, etc.)

- **Makefile** — Common commands:
  - `make dev` — Start local development (all services)
  - `make build` — Build all services
  - `make test` — Run all tests
  - `make lint` — Lint all code
  - `make up` / `make down` — Docker compose up/down
  - `make logs` — Tail logs
  - `make clean` — Remove build artifacts
  - `make setup` — First-time setup

- **scripts/setup.sh** — Automated first-time setup:
  - Check prerequisites (node, python, docker, etc.)
  - Install dependencies for all services
  - Copy .env.example to .env if .env doesn't exist
  - Run database migrations
  - Seed sample data
  - Print "ready to go" message with next steps

- **scripts/dev.sh** — Start all services for local development

## Guidelines

- README must be specific to the actual stack selected, not generic boilerplate
- .gitignore must cover all selected languages and tools
- Makefile targets must work for the specific project structure
- setup.sh must detect the user's OS (macOS/Linux) and adapt
- All scripts must be executable and have a shebang line
- **The project must be usable immediately after running `make setup && make dev`**

## Standalone Usage

Always generated as part of the Constellation flow. Can also be invoked to regenerate project docs for an existing project.
