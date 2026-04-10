# Constellation

Interactive CLI project generator that scaffolds fully configured projects from your preferred tech stack. Pick technologies across six categories and get a production-ready project structure with proper configs, dependencies, Docker setups, CI/CD pipelines, and more.

## Features

- **Interactive CLI** -- step-by-step prompts guide you through technology selection
- **80+ technologies** across frontend, backend, database, infrastructure, testing, and monitoring
- **Extensible YAML registry** -- add new technologies by editing YAML files
- **Compatibility validation** -- catches conflicts (e.g. React + Angular) and missing requirements (e.g. Nuxt without Vue) before generation
- **Optimized Docker configs** -- multi-stage builds with security best practices
- **CI/CD pipelines** -- GitHub Actions, GitLab CI out of the box
- **Kubernetes manifests** -- deployment, service, and ingress configs
- **Multiple languages** -- TypeScript/Node.js, Python, Go backends supported
- **Monorepo support** -- optional Turborepo or Nx setup

## Quick Start

```bash
# Install globally
npm install -g constellation

# Generate a new project
npx constellation new
```

The interactive prompts will walk you through selecting your stack.

## Example Output

For a **React + Fastify + PostgreSQL + Docker** stack, Constellation generates:

```
my-app/
  frontend/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
  backend/
    package.json
    tsconfig.json
    Dockerfile
    .dockerignore
    src/
      index.ts
      routes/items.ts
      plugins/cors.ts
  docker-compose.yml
  .env.example
  .gitignore
  Makefile
  scripts/setup.sh
  README.md
```

## Architecture

Constellation follows a **pipeline architecture**:

1. **Selection** -- the CLI collects user choices via interactive prompts
2. **Validation** -- compatibility rules (YAML-defined) catch conflicts and missing dependencies
3. **Generation** -- per-category generators produce files from templates and inline builders
4. **Output** -- files are written to disk, post-generation commands are executed

Key modules:

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Types, engine, pipeline orchestration |
| `src/cli/` | Commander setup, interactive prompts, UI helpers |
| `src/registry/` | YAML-based technology registry with loader |
| `src/validators/` | Compatibility rules and validation engine |
| `src/generators/` | Per-category file generators (frontend, backend, database, infra, testing, monitoring, common) |
| `src/templates/` | Handlebars template engine |
| `tests/` | Vitest test suite |

## Adding New Technologies

Technologies are defined in YAML files under `src/registry/technologies/`. Each file contains an array of technology definitions:

```yaml
technologies:
  - id: my-framework
    name: My Framework
    category: backend
    description: A fast web framework
    language: typescript
    version: "1.0.0"
    tags: [web, api, fast]
    homepage: https://example.com
```

Categories: `frontend`, `css`, `build`, `state`, `backend`, `database`, `cache`, `orm`, `containerization`, `orchestration`, `cloud`, `cicd`, `testing-unit`, `testing-e2e`, `testing-api`, `observability`, `logging`, `error-tracking`.

To add compatibility rules, edit `src/validators/rules.yml`:

```yaml
rules:
  - id: "my-rule"
    type: "conflict"       # conflict | requires | warns
    techs: ["tech-a", "tech-b"]
    message: "Tech A and Tech B conflict"
```

## Adding New Generators

Each generator is a factory function returning the `Generator` interface:

```typescript
import type { Generator, GeneratorContext, GeneratorResult } from '../core/types.js';

export function createMyGenerator(): Generator {
  return {
    name: 'my-generator',
    description: 'Generates files for ...',
    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const files = [];
      // Build files based on ctx.selection.technologies
      return { files };
    },
  };
}
```

Register it in `src/generators/index.ts` by adding the factory to `GROUP_FACTORIES` and `getGenerators()`.

## Available Commands

| Command | Description |
|---------|-------------|
| `constellation new` | Start the interactive project generator |
| `constellation list` | List all available technologies |
| `constellation validate` | Validate a technology selection |

## Tech Stack

Constellation itself is built with:

- **TypeScript** -- strict mode, ESM
- **Node.js** >= 20
- **Commander.js** -- CLI framework
- **@inquirer/prompts** -- interactive terminal prompts
- **Handlebars** -- template rendering
- **js-yaml** -- YAML parsing for the technology registry and rules
- **chalk + ora** -- terminal styling and spinners
- **Vitest** -- test runner
- **tsup** -- bundler
- **ESLint + Prettier** -- linting and formatting

## Development

```bash
npm install          # Install dependencies
npm run dev          # Run CLI in development mode
npm test             # Run tests with Vitest
npm run build        # Build with tsup
npm run lint         # Lint with ESLint
npm run typecheck    # Type check with tsc
```

## License

MIT
