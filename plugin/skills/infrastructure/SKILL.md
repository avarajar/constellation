---
description: Generate or add infrastructure files — Dockerfiles, docker-compose, CI/CD pipelines, cloud config, IaC, and local dev scripts
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

**Dockerfile for frontend:**
- Multi-stage: deps → build → nginx/serve with minimal image
- Non-root user
- Health check
- `.dockerignore` (node_modules, .git, tests, .env)

**Dockerfile for backend:**
- Multi-stage: deps → build → minimal runtime
- Non-root user
- Health check
- `.dockerignore`

### Docker Compose

**`docker-compose.yml`** (production-like):
- Frontend service (nginx-served build)
- Backend service
- Database service (with health check, persistent volume, init scripts)
- Cache service (Redis/Memcached if selected)
- Proper networking between services
- Environment variables via `.env` file

**`docker-compose.dev.yml`** (local development override):
- Frontend with hot-reload (volume mount src/, expose dev port)
- Backend with hot-reload (volume mount src/, use dev command like `npm run dev` or `python manage.py runserver`)
- Debug ports exposed
- `command` overrides for dev mode

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):
- Trigger on push to main and PRs
- Jobs: lint → test → build → deploy
- Dependency caching (npm cache, pip cache)
- Docker image build and push (to GHCR or DockerHub)
- Environment-specific deploy (staging on PR merge, production on tag/release)

**GitLab CI** (`.gitlab-ci.yml`):
- Stages: lint, test, build, deploy
- Cache config
- Docker-in-Docker for image builds

**CircleCI** (`.circleci/config.yml`):
- Orbs for language-specific setup
- Workflows with approval gates

### Cloud Deployment

When a cloud provider is selected, ask the user which deployment model they want:

**AWS options:**
- **ECS Fargate** (containers, serverless): Task definition, ECS service, ALB, ECR repo. Include `infra/aws/ecs/` with Terraform or CloudFormation templates.
- **EC2** (VMs): Launch template, Auto Scaling Group, ALB, user data script. Include `infra/aws/ec2/`.
- **Lambda** (serverless functions): SAM template or serverless.yml. Include `infra/aws/lambda/`.
- **App Runner** (simplest): apprunner.yaml config.
- Common: VPC, security groups, RDS/ElastiCache if database selected, S3 for static assets, CloudFront CDN.

**Azure options:**
- **Container Apps** (containers, serverless): Bicep or Terraform templates with container app config.
- **App Service** (PaaS): App Service plan, web app config. Include `infra/azure/app-service/`.
- **AKS** (Kubernetes): Helm charts, AKS cluster config.
- **Functions** (serverless): Function app config, host.json.
- Common: Resource group, Azure Container Registry, Azure Database for PostgreSQL, Redis Cache.

**GCP options:**
- **Cloud Run** (containers, serverless): `service.yaml`, Dockerfile optimized for Cloud Run.
- **App Engine** (PaaS): `app.yaml` config.
- **GKE** (Kubernetes): Helm charts, GKE cluster config.
- **Cloud Functions** (serverless): Function configs.
- Common: Artifact Registry, Cloud SQL, Memorystore.

**Vercel:**
- `vercel.json` or `vercel.ts` config
- Environment variables setup guide
- Serverless function wrappers if needed

**Netlify:**
- `netlify.toml` with build commands, redirects, headers
- Serverless functions in `netlify/functions/`

**Render:**
- `render.yaml` Blueprint with all services defined
- Build and start commands

**Railway:**
- `railway.toml` or Procfile
- Service config

### Infrastructure as Code (IaC)

If AWS, Azure, or GCP selected, include:
- **Terraform** (`infra/terraform/`):
  - `main.tf` — provider, resources
  - `variables.tf` — input variables
  - `outputs.tf` — useful outputs (URLs, IPs)
  - `terraform.tfvars.example` — example variable values
  - `.terraform-version` — tfenv version file
- Or **Pulumi/CDK** if the user's language matches (TypeScript CDK, Python Pulumi)

### Secrets Management
- `.env.example` with ALL required secrets documented
- If AWS: reference to AWS Secrets Manager or SSM Parameter Store
- If Azure: reference to Azure Key Vault
- If GCP: reference to Secret Manager
- Docker secrets setup in compose if applicable

### SSL & Reverse Proxy
- `nginx.conf` for production (reverse proxy to backend, serve frontend static files)
- SSL termination config (Certbot/Let's Encrypt instructions in README)
- Or platform-managed SSL (Vercel, Render, Railway handle this automatically)

### Local Development Scripts
- `scripts/dev.sh` — Start entire stack locally (docker-compose up or individual services)
- `scripts/setup.sh` — First-time setup: install deps, create .env from .env.example, run migrations, seed data
- `scripts/reset-db.sh` — Drop and recreate database with fresh migrations and seed data
- `scripts/logs.sh` — Tail logs from all services
- `scripts/deploy.sh` — Deploy to configured cloud (with environment argument: `./scripts/deploy.sh staging`)

### Makefile
- `make dev` — Start local development
- `make build` — Build all services
- `make test` — Run all tests
- `make lint` — Lint all code
- `make format` — Format all code
- `make up` — Start with docker-compose (production)
- `make up-dev` — Start with docker-compose (dev mode with hot reload)
- `make down` — Stop docker-compose
- `make logs` — Tail all logs
- `make clean` — Remove build artifacts and containers
- `make deploy-staging` — Deploy to staging
- `make deploy-prod` — Deploy to production

### Environments
- `envs/` directory with environment-specific configs:
  - `envs/.env.development` — local dev defaults
  - `envs/.env.staging` — staging values (with placeholders for secrets)
  - `envs/.env.production` — production values (with placeholders for secrets)

## Guidelines

- Use multi-stage Docker builds for smallest possible images
- Include health checks in all docker-compose services
- CI pipelines must cache dependencies
- Use environment variables for ALL secrets and configuration
- **The project must be runnable locally with a single command** (`make dev` or `scripts/dev.sh`)
- Docker Compose dev config must support hot-reload for both frontend and backend
- All scripts must be executable (`chmod +x`) with shebang lines
- Scripts must work on macOS and Linux
- IaC should be modular and well-documented
- Cloud configs should include cost-efficient defaults for small projects

## Standalone Usage

To add infrastructure to an existing project:

1. Ask what containerization, CI/CD, and cloud the user wants
2. If cloud selected, ask which deployment model (ECS/Lambda/EC2, Cloud Run/App Engine, etc.)
3. Detect existing project structure (frontend/, backend/ directories, languages used)
4. Generate Dockerfiles, compose files, CI pipelines, cloud configs, and dev scripts
