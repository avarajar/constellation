---
description: Generate common project files — README, .gitignore, .env.example, Makefile, pre-commit, editorconfig, and setup scripts
---

# Constellation — Common Files Generation

Generate root-level project files that every project needs.

## What You Generate

### README.md
Full documentation covering:
- Project name and description
- Tech stack overview (every selected technology with versions)
- Prerequisites (Node.js, Python, Docker, etc. with minimum versions)
- Quick start: how to run locally in 3 steps or less
- Full setup instructions (step by step)
- API documentation with all endpoints (method, path, description, request/response examples)
- Environment variables reference table (name, description, required/optional, default)
- Project structure tree (showing all directories and key files)
- Available scripts/commands reference (`make dev`, `npm test`, etc.)
- Deployment instructions for the configured cloud provider
- Contributing guidelines summary (or link to CONTRIBUTING.md)
- License

### .env.example
- All required environment variables with placeholder values
- Comments explaining each variable
- Grouped by section (database, cache, auth, monitoring, cloud)

### .gitignore
- Comprehensive ignore file covering all selected technologies
- node_modules, __pycache__, .env, dist, build, coverage, .DS_Store
- IDE files (.vscode/settings.json but not .vscode/extensions.json)
- Docker volumes, terraform state

### Makefile
Common commands:
- `make dev` — Start local development (all services)
- `make build` — Build all services
- `make test` — Run all tests
- `make test-coverage` — Run tests with coverage
- `make lint` — Lint all code
- `make format` — Format all code
- `make up` / `make down` — Docker compose up/down
- `make up-dev` — Docker compose with dev overrides
- `make logs` — Tail logs
- `make clean` — Remove build artifacts
- `make setup` — First-time setup
- `make deploy-staging` / `make deploy-prod` — Deploy

### scripts/setup.sh
Automated first-time setup:
- Check prerequisites (node, python, docker, etc.) with version checks
- Install dependencies for all services (`npm install`, `pip install -r requirements.txt`)
- Copy .env.example to .env if .env doesn't exist
- Run database migrations
- Seed sample data
- Install pre-commit hooks
- Print "ready to go" message with next steps

### scripts/dev.sh
Start all services for local development:
- Check if Docker is running
- Start database and cache containers
- Wait for database health check
- Start backend in dev mode (background)
- Start frontend in dev mode (background)
- Print URLs for frontend and backend

### Pre-commit Configuration

**`.pre-commit-config.yaml`** (if Python in stack):
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
      - id: detect-private-key
```

**husky + lint-staged** (if Node.js in stack):
- `.husky/pre-commit` hook
- `lint-staged` config in package.json

### .editorconfig
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.py]
indent_size = 4

[*.go]
indent_style = tab

[Makefile]
indent_style = tab
```

### Dependabot / Renovate
**`.github/dependabot.yml`** (if GitHub):
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /frontend
    schedule:
      interval: weekly
  - package-ecosystem: pip
    directory: /backend
    schedule:
      interval: weekly
  - package-ecosystem: docker
    directory: /
    schedule:
      interval: monthly
```

### CONTRIBUTING.md
- How to set up the dev environment
- Branch naming conventions
- Commit message format (conventional commits)
- How to run tests
- How to submit a PR
- Code review process

### LICENSE
- MIT, Apache 2.0, or the license specified in the blueprint
- Full license text file

## Guidelines

- README must be specific to the actual stack selected, not generic boilerplate
- .gitignore must cover all selected languages and tools
- Makefile targets must work for the specific project structure
- setup.sh must detect the user's OS (macOS/Linux) and adapt commands
- All scripts must be executable and have a shebang line (`#!/usr/bin/env bash`)
- **The project must be usable immediately after running `make setup && make dev`**
- Pre-commit hooks must be installed automatically by setup.sh

## Standalone Usage

Always generated as part of the Constellation flow. Can also be invoked to regenerate project docs for an existing project.
