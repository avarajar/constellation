---
description: Generate or add infrastructure files — Dockerfiles, docker-compose, CI/CD pipelines, and cloud configuration
---

# Constellation — Infrastructure Generation

Generate infrastructure and deployment configuration for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.infrastructure` + `generation.docker` + `generation.ci` sections), or accept these inputs directly:
- **Containerization**: Docker, Podman
- **Orchestration**: Kubernetes, Docker Compose
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI, Jenkins
- **Cloud**: AWS, GCP, Azure, Vercel, Netlify, Render, Railway

## What You Generate

- If containerization is specified:
  - Dockerfile for frontend (multi-stage: deps, build, nginx/serve)
  - Dockerfile for backend (multi-stage: deps, build, minimal runtime)
  - .dockerignore files
- If docker-compose is enabled:
  - docker-compose.yml with services for frontend, backend, and database
  - Proper networking, volume mounts, environment variables, health checks
- If CI/CD is specified:
  - Pipeline configuration for the chosen platform
  - Stages for lint, test, build, deploy
- Cloud-specific deployment configs if applicable

## Guidelines

- Use multi-stage Docker builds for smallest possible images
- Include health checks in docker-compose services
- CI pipelines should cache dependencies
- Use environment variables for all secrets

## Standalone Usage

To add infrastructure to an existing project:

1. Ask what containerization and CI/CD the user wants
2. Detect existing project structure
3. Generate Dockerfiles, compose files, and CI pipelines
