---
description: Generate common project files — README, .gitignore, .env.example, Makefile, and setup script
---

# Constellation — Common Files Generation

Generate root-level project files that every project needs.

## What You Generate

- **README.md** — Full documentation: stack overview, prerequisites, setup instructions, API docs, env vars reference, project structure
- **.env.example** — All required environment variables with placeholder values
- **.gitignore** — Comprehensive ignore file covering all selected technologies
- **Makefile** — Common commands: dev, build, test, lint, up, down, clean
- **scripts/setup.sh** — Automated setup script that installs dependencies for all services

## Guidelines

- README should be specific to the actual stack selected, not generic
- .gitignore should cover all selected languages and tools
- Makefile should have targets that work for the specific project structure
- setup.sh should detect the user's OS and install prerequisites

## Standalone Usage

Always generated as part of the Constellation flow. Can also be invoked to regenerate project docs for an existing project.
