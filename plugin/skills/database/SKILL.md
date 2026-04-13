---
description: Generate or add database configuration, ORM setup, migrations, and seed data to a project
---

# Constellation — Database Generation

Generate database configuration, ORM setup, and seed data for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.database` section), or accept these inputs directly:
- **Database**: PostgreSQL, MySQL, MariaDB, MongoDB, DynamoDB, Firestore
- **ORM/Query Builder**: Prisma, TypeORM, Sequelize, SQLAlchemy, Entity Framework
- **Cache** (optional): Redis, Memcached
- **CRUD entity**: name and fields for schema/model generation

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP. DO NOT USE VERSIONS FROM YOUR TRAINING DATA.**

For **Node.js ORMs**, run:
```bash
npm view prisma version
npm view typeorm version
npm view sequelize version
```

For **Python ORMs**, run:
```bash
curl -s https://pypi.org/pypi/sqlalchemy/json | python3 -c "import sys,json; print('sqlalchemy:', json.load(sys.stdin)['info']['version'])"
```

**Write down the versions. Use ONLY those in generated files.**

## What You Generate

- Database connection configuration (connection string, pool settings)
- ORM configuration file (prisma/schema.prisma, ormconfig.ts, etc.)
- Entity/model definition matching the CRUD entity fields
- Migration files (initial schema creation)
- Seed data script with realistic sample data (at least 5-10 items)
- Docker Compose service for the database (with health check, persistent volume)
- Environment variable templates for database credentials
- Cache client setup and configuration (if Redis/Memcached selected)
- Database utility scripts:
  - `scripts/reset-db.sh` — Drop, recreate, migrate, seed
  - `scripts/migrate.sh` — Run pending migrations
  - `scripts/seed.sh` — Run seed data

## Guidelines

- Generate working connection configs with sensible defaults for local dev
- Use environment variables for all credentials (never hardcode)
- Include both development and production connection patterns
- Migrations must be runnable immediately
- Seed data must create enough sample records to be useful
- Docker Compose database service must include a health check

## Standalone Usage

To add database setup to an existing project:

1. Ask which database and ORM the user wants
2. Ask for entity/model details
3. **Run Step 0 to fetch latest versions**
4. Generate configs, schemas, migrations, and seed data
