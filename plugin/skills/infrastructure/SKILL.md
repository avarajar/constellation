---
description: Generate or add infrastructure files — Dockerfiles, docker-compose, CI/CD pipelines, cloud config, and local dev scripts
---

# Constellation — Infrastructure Generation

Generate infrastructure, deployment, and local development configuration for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.infrastructure` + `generation.docker` + `generation.ci` sections), or accept these inputs directly:
- **Containerization**: Docker, Podman
- **Orchestration**: Kubernetes, Docker Compose
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI, Jenkins
- **Cloud**: AWS, GCP, Azure, Vercel, Netlify, Render, Railway

## What You Generate

### Containerization
- Dockerfile for frontend (multi-stage: deps → build → nginx/serve with minimal image)
- Dockerfile for backend (multi-stage: deps → build → minimal runtime image)
- .dockerignore files for both (exclude node_modules, .git, tests, etc.)

### Docker Compose (if enabled)
- `docker-compose.yml` with services for:
  - Frontend (with hot-reload volume mount for dev)
  - Backend (with hot-reload volume mount for dev)
  - Database (with persistent volume, init scripts)
  - Cache (Redis/Memcached if selected)
- `docker-compose.dev.yml` override for local development (live reload, debug ports)
- Proper networking between services
- Health checks on all services
- Environment variables via `.env` file

### CI/CD Pipeline
- Pipeline configuration for the chosen platform (GitHub Actions, GitLab CI, etc.)
- Stages: lint → test → build → deploy
- Dependency caching for faster builds
- Environment-specific deploy jobs (staging, production)
- Docker image build and push steps

### Local Development Scripts
- `scripts/dev.sh` — Start entire stack locally (docker-compose up or individual services)
- `scripts/setup.sh` — First-time setup: install deps, create .env from .env.example, run migrations, seed data
- `scripts/reset-db.sh` — Drop and recreate database with fresh migrations and seed data
- `scripts/logs.sh` — Tail logs from all services

### Cloud Deployment
- Cloud-specific deployment configuration if a cloud provider is selected:
  - **Vercel**: `vercel.json` or `vercel.ts` config
  - **AWS**: basic Terraform or CloudFormation template
  - **Railway/Render**: `railway.toml` / `render.yaml`
  - **Netlify**: `netlify.toml`

### Makefile
- `make dev` — Start local development
- `make build` — Build all services
- `make test` — Run all tests
- `make lint` — Lint all code
- `make up` — Start with docker-compose
- `make down` — Stop docker-compose
- `make logs` — Tail all logs
- `make clean` — Remove build artifacts and containers
- `make deploy` — Deploy to configured cloud

## Guidelines

- Use multi-stage Docker builds for smallest possible images
- Include health checks in all docker-compose services
- CI pipelines must cache dependencies
- Use environment variables for ALL secrets and configuration
- **The project must be runnable locally with a single command** (`make dev` or `scripts/dev.sh`)
- Docker Compose dev config should support hot-reload for both frontend and backend
- All scripts must be executable (`chmod +x`)
- Scripts should work on macOS and Linux

## Standalone Usage

To add infrastructure to an existing project:

1. Ask what containerization and CI/CD the user wants
2. Detect existing project structure (frontend/, backend/ directories, languages used)
3. Generate Dockerfiles, compose files, CI pipelines, and dev scripts
