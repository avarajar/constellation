---
description: Generate or add a backend layer to a project — server framework, REST API, database connection, and CRUD endpoints
---

# Constellation — Backend Generation

Generate the `backend/` directory with a complete, working backend application.

## What You Need

Either read from a Constellation blueprint YAML (`stack.backend` + `stack.database` sections), or accept these inputs directly:
- **Framework**: Express, Fastify, Hono, NestJS, Elysia, Django, Flask, FastAPI, Starlette, Gin, Echo, Chi, Actix, Axum, Rocket, Spring Boot, Quarkus, ASP.NET Core
- **Language/Runtime**: TypeScript/Node.js, Python, Go, Rust, Java, C#
- **Database + ORM** (optional): PostgreSQL/MySQL/MongoDB + Prisma/TypeORM/SQLAlchemy/etc.
- **CRUD entity**: name and fields for the sample REST API
- **Features**: CORS, health check, error handling, env config

## What You Generate

- Server setup with the specified framework
- Correct language and runtime configuration
- CORS middleware (if requested)
- Health check endpoint at GET /health (if requested)
- Error handling middleware (if requested)
- Environment variable configuration (if requested)
- Complete REST API for the CRUD entity:
  - `GET /api/{entities}` — list all with pagination
  - `GET /api/{entities}/:id` — get one by ID
  - `POST /api/{entities}` — create with input validation
  - `PUT /api/{entities}/:id` — update with input validation
  - `DELETE /api/{entities}/:id` — delete
- Database connection using the specified ORM (or raw queries if no ORM)
- Database model/schema for the CRUD entity
- Migration and seed script (if ORM supports it)
- Dependency file with versions

## Guidelines

- Generate **real, functional code** — not boilerplate stubs
- Use current stable versions for all dependencies
- Backend must validate all inputs and return appropriate HTTP status codes
- Pluralize the entity name for REST routes

## Standalone Usage

To add a backend to an existing project:

1. Ask the user which framework and language they want
2. Ask for database and ORM preferences
3. Ask for the output directory
4. Ask for CRUD entity details (or skip CRUD if not needed)
5. Generate the backend/ directory following the guidelines above
