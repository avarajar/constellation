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
- Sample unit tests for the CRUD entity logic
- E2E test configuration and sample spec
- API test collections/files for the CRUD endpoints
- Test scripts in package.json (or equivalent)
- CI-compatible test commands

## Guidelines

- Tests should be runnable immediately after generation
- Include both passing sample tests and test structure
- E2E tests should cover the main CRUD flow
- API tests should cover all REST endpoints

## Standalone Usage

To add testing to an existing project:

1. Ask which test frameworks the user wants
2. Detect existing project structure and language
3. Generate configs and sample tests
