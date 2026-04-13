---
description: Generate or add database configuration, ORM setup, migrations, seed data, and backup scripts
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

**DO NOT SKIP THIS STEP.**

For Node.js ORMs:
```bash
for pkg in prisma typeorm sequelize mongoose redis ioredis; do
  ver=$(npm view "$pkg" version 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg@$ver"
done
```

For Python ORMs:
```bash
for pkg in sqlalchemy alembic psycopg2-binary pymongo redis django-redis; do
  ver=$(curl -s "https://pypi.org/pypi/$pkg/json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])" 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg==$ver"
done
```

**Write down the versions. Use ONLY those in generated files.**

## What You Generate

### Database Connection
- Connection configuration with connection pooling:
  - **PostgreSQL**: connection string, pool min/max, idle timeout
  - **MySQL**: connection string, pool config
  - **MongoDB**: connection string, replica set config
- Environment-based config: `DATABASE_URL` from `.env`
- Separate configs for development, testing, and production

### ORM Configuration
- **Prisma**: `prisma/schema.prisma` with datasource, generator, and models
- **TypeORM**: `data-source.ts` with entities, migrations path, and connection options
- **Sequelize**: `config/database.js` with environments and `.sequelizerc`
- **SQLAlchemy**: `database.py` with engine, session factory, and Base model
- **Entity Framework**: `DbContext` class with `OnModelCreating`

### Entity/Model
- Full CRUD entity matching blueprint fields with:
  - Primary key (UUID or auto-increment)
  - Created/updated timestamps
  - Proper types and constraints (NOT NULL, UNIQUE, etc.)
  - Indexes on commonly queried fields
  - Relationships if multiple entities

### Migrations
- Initial migration creating the schema
- Migration scripts runnable with a single command:
  - Prisma: `npx prisma migrate dev`
  - Alembic: `alembic upgrade head`
  - TypeORM: `npx typeorm migration:run`
  - Django: `python manage.py migrate`

### Seed Data
- Seed script with realistic sample data (10-20 items)
- Uses faker/factory patterns for generating diverse data
- Idempotent — safe to run multiple times
- Script: `npm run seed` or `python manage.py seed`

### Cache Configuration
- **Redis**: connection setup, basic cache helpers (get/set/del with TTL)
- **Memcached**: connection setup with basic operations
- Cache middleware for common patterns (response caching, session cache)
- `REDIS_URL` / `CACHE_URL` from environment

### Docker Compose Services
- Database service with:
  - Health check (`pg_isready`, `mysqladmin ping`, etc.)
  - Persistent volume for data
  - Init scripts directory for schema bootstrap
  - Exposed port for local access (5432, 3306, 27017)
- Cache service (Redis) with:
  - Health check
  - Persistent volume (optional)
  - Exposed port (6379)

### Utility Scripts
- `scripts/reset-db.sh` — Drop, recreate, migrate, seed
- `scripts/migrate.sh` — Run pending migrations
- `scripts/seed.sh` — Run seed data
- `scripts/backup-db.sh` — Dump database to file (pg_dump, mongodump, etc.)
- `scripts/restore-db.sh` — Restore from backup file

## Guidelines

- Generate working connection configs with sensible defaults for local dev
- Use environment variables for all credentials (never hardcode)
- Include both development and production connection patterns
- Migrations must be runnable immediately
- Seed data must create enough sample records to be useful (10-20 items)
- Docker Compose database service must include a health check
- Backup/restore scripts should include timestamps in filenames
- **CRITICAL: Use the EXACT versions from Step 0.** Do NOT guess versions.

## Standalone Usage

To add database setup to an existing project:

1. Ask which database and ORM the user wants
2. Ask for entity/model details
3. **Run Step 0 to fetch latest versions**
4. Generate configs, schemas, migrations, seed data, and utility scripts
