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

## What You Generate

- Database connection configuration
- ORM configuration file (prisma/schema.prisma, ormconfig.ts, etc.)
- Entity/model definition matching the CRUD entity fields
- Migration files (initial schema)
- Seed data script
- Docker Compose service for the database (if not already present)
- Environment variable templates for database credentials
- Cache client setup (if Redis/Memcached selected)

## Guidelines

- Generate working connection configs with sensible defaults
- Use environment variables for all credentials
- Include both development and production connection patterns
- Migrations should be runnable immediately

## Standalone Usage

To add database setup to an existing project:

1. Ask which database and ORM the user wants
2. Ask for entity/model details
3. Generate configs, schemas, and migrations
