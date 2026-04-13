---
description: Generate or add testing setup — unit tests, E2E tests, API tests, coverage, and load testing
---

# Constellation — Testing Generation

Generate testing configuration, sample tests, and test utilities for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.testing` section), or accept these inputs directly:
- **Unit testing**: Jest, Vitest, Pytest, xUnit
- **E2E testing**: Cypress, Playwright, Selenium
- **API testing**: Postman Collections, REST Client, Thunder Client

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP.**

```bash
for pkg in jest vitest cypress @playwright/test @testing-library/react @testing-library/vue msw; do
  ver=$(npm view "$pkg" version 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg@$ver"
done
```

For Python:
```bash
for pkg in pytest pytest-cov pytest-mock factory-boy faker; do
  ver=$(curl -s "https://pypi.org/pypi/$pkg/json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])" 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg==$ver"
done
```

**Use ONLY the fetched versions.**

## What You Generate

### Unit Testing
- Test framework configuration (jest.config.ts, vitest.config.ts, pytest.ini, etc.)
- Sample unit tests for the CRUD entity logic (at least 5 tests covering create, read, update, delete, validation)
- Test utilities:
  - **Factories**: test data factories using faker/factory-boy for generating realistic test data
  - **Fixtures**: reusable test fixtures for database setup/teardown
  - **Helpers**: common test helpers (auth tokens, API clients, etc.)

### E2E Testing
- E2E framework configuration (cypress.config.ts, playwright.config.ts)
- Sample spec covering the full CRUD flow:
  - Navigate to list page
  - Create a new item
  - Verify it appears in the list
  - Edit the item
  - Delete the item
  - Verify it's gone
- Page objects or test helpers for selectors
- CI configuration for headless E2E runs

### API Testing
- **Postman**: Collection JSON with all CRUD endpoints, environment variables, and test scripts
- **REST Client**: `.http` files with all endpoints and sample payloads
- **Thunder Client**: Collection export

### Mocking
- **Frontend (Node.js)**: MSW (Mock Service Worker) setup for API mocking in tests and development:
  - `src/mocks/handlers.ts` — mock API handlers
  - `src/mocks/browser.ts` — browser worker setup
  - `src/mocks/server.ts` — test server setup
- **Backend (Python)**: `pytest-mock` fixtures, `responses` or `httpretty` for HTTP mocking
- **Backend (Node.js)**: `nock` or `msw` for HTTP mocking

### Coverage
- Coverage configuration:
  - **Vitest/Jest**: `coverage` config in vitest.config.ts or jest.config.ts with `c8` or `istanbul` provider
  - **Pytest**: `pytest-cov` with `.coveragerc` or `[tool.coverage]` in pyproject.toml
- Coverage thresholds (minimum 70% for new projects)
- Coverage report formats: text (terminal), html (local viewing), lcov (CI integration)
- `npm run test:coverage` or `pytest --cov` script

### Load Testing (basic)
- **k6** script (`tests/load/load-test.js`):
  - Test CRUD endpoints under load
  - Configurable VUs and duration
  - Thresholds for response time (p95 < 500ms)
- Or **Artillery** config (`tests/load/artillery.yml`) as alternative
- Script to run: `make load-test` or `npm run test:load`

### Test Scripts
- `npm test` or `pytest` — Run unit tests
- `npm run test:watch` — Watch mode
- `npm run test:coverage` — With coverage report
- `npm run test:e2e` — Run E2E tests
- `npm run test:api` — Run API tests
- `npm run test:load` — Run load tests
- `npm run test:all` — Run everything

## Guidelines

- Tests must be runnable immediately after generation with a single command
- Include passing sample tests that actually verify behavior
- E2E tests must cover: create, read, update, delete flows
- API tests must cover all REST endpoints with success and error cases
- Include test setup/teardown for database state
- Coverage config should output HTML reports to `coverage/`
- Load tests should have sensible defaults (10 VUs, 30s duration)

## Standalone Usage

To add testing to an existing project:

1. Ask which test frameworks the user wants
2. Detect existing project structure and language
3. **Run Step 0 to fetch latest versions**
4. Generate configs, sample tests, mocks, coverage, and test utilities
