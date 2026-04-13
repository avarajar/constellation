---
description: Generate or add testing setup — unit tests, E2E tests, and API test configuration
---

# Constellation — Testing Generation

Generate testing configuration and sample tests for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.testing` section), or accept these inputs directly:
- **Unit testing**: Jest, Vitest, Pytest, xUnit
- **E2E testing**: Cypress, Playwright, Selenium
- **API testing**: Postman Collections, REST Client, Thunder Client

## What You Generate

- Test framework configuration (jest.config.ts, vitest.config.ts, pytest.ini, etc.)
- Sample unit tests for the CRUD entity logic (at least 5 tests)
- E2E test configuration and sample spec covering the main CRUD flow
- API test collections/files for all CRUD endpoints
- Test scripts in package.json (or equivalent): `npm test`, `npm run test:e2e`, `npm run test:api`
- CI-compatible test commands
- Test utilities/helpers (factories, fixtures, test database setup)

## Guidelines

- Tests must be runnable immediately after generation with a single command
- Include passing sample tests that actually verify behavior
- E2E tests must cover: create, read, update, delete flows
- API tests must cover all REST endpoints with success and error cases
- **CRITICAL: Use the EXACT versions from the blueprint YAML** for test framework packages. Do NOT guess versions.
- Include test setup/teardown for database state

## Standalone Usage

To add testing to an existing project:

1. Ask which test frameworks the user wants
2. Detect existing project structure and language
3. Run `npm view <package> version` to get latest versions
4. Generate configs, sample tests, and test utilities
