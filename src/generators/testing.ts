/**
 * Testing setup generator.
 * Handles: Vitest, Jest, Pytest, Go test, Playwright, Cypress, k6, Artillery.
 */
import type {
  Generator,
  GeneratorContext,
  GeneratorResult,
  GeneratedFile,
  PostGenCommand,
  TechCategory,
  SelectedTech,
} from '../core/types.js';

function hasTech(ctx: GeneratorContext, id: string): boolean {
  return ctx.selection.technologies.some((t) => t.id === id);
}

function getTech(ctx: GeneratorContext, category: TechCategory): SelectedTech | undefined {
  return ctx.selection.technologies.find((t) => t.category === category);
}

function isNodeBackend(ctx: GeneratorContext): boolean {
  return (
    hasTech(ctx, 'express') ||
    hasTech(ctx, 'fastify') ||
    hasTech(ctx, 'koa') ||
    hasTech(ctx, 'hono') ||
    hasTech(ctx, 'nestjs')
  );
}

// ─── Vitest ────────────────────────────────────────────────────────

function vitestConfig(): string {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
`;
}

function vitestSampleTest(ctx: GeneratorContext): string {
  if (hasTech(ctx, 'fastify')) {
    return `import { describe, it, expect } from 'vitest';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

describe('Items CRUD', () => {
  const items: Item[] = [];

  function createItem(title: string): Item {
    const item: Item = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    return item;
  }

  it('should create an item', () => {
    const item = createItem('Test item');
    expect(item.title).toBe('Test item');
    expect(item.completed).toBe(false);
    expect(item.id).toBeDefined();
  });

  it('should list items', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('should toggle an item', () => {
    const item = items[0]!;
    item.completed = !item.completed;
    expect(item.completed).toBe(true);
  });

  it('should delete an item', () => {
    const id = items[0]!.id;
    const index = items.findIndex((i) => i.id === id);
    items.splice(index, 1);
    expect(items.find((i) => i.id === id)).toBeUndefined();
  });
});
`;
  }

  return `import { describe, it, expect } from 'vitest';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

describe('Items CRUD', () => {
  const items: Item[] = [];

  function createItem(title: string): Item {
    const item: Item = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    return item;
  }

  it('should create an item', () => {
    const item = createItem('Test item');
    expect(item.title).toBe('Test item');
    expect(item.completed).toBe(false);
    expect(item.id).toBeDefined();
  });

  it('should list items', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('should toggle an item', () => {
    const item = items[0]!;
    item.completed = !item.completed;
    expect(item.completed).toBe(true);
  });

  it('should delete an item', () => {
    const id = items[0]!.id;
    const index = items.findIndex((i) => i.id === id);
    items.splice(index, 1);
    expect(items.find((i) => i.id === id)).toBeUndefined();
  });
});
`;
}

// ─── Jest ──────────────────────────────────────────────────────────

function jestConfig(): string {
  return `/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\\\.{1,2}/.*)\\\\.js$': '$1',
  },
  transform: {
    '^.+\\\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
`;
}

// ─── Pytest ────────────────────────────────────────────────────────

function pytestIni(): string {
  return `[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short
`;
}

function pytestSampleTest(ctx: GeneratorContext): string {
  if (hasTech(ctx, 'fastapi')) {
    return `from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_item():
    response = client.post("/api/items", json={"title": "Test item"})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test item"
    assert data["completed"] is False


def test_list_items():
    response = client.get("/api/items")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_item_without_title():
    response = client.post("/api/items", json={})
    assert response.status_code == 422
`;
  }

  if (hasTech(ctx, 'flask')) {
    return `import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_create_item(client):
    response = client.post("/api/items", json={"title": "Test item"})
    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "Test item"


def test_list_items(client):
    response = client.get("/api/items")
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)
`;
  }

  return `def test_placeholder():
    assert True
`;
}

// ─── Playwright ────────────────────────────────────────────────────

function playwrightConfig(): string {
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
  },
});
`;
}

function playwrightSampleTest(): string {
  return `import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });

  test('should display a heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });
});
`;
}

// ─── Cypress ───────────────────────────────────────────────────────

function cypressConfig(): string {
  return `import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
});
`;
}

function cypressSampleTest(): string {
  return `describe('Home page', () => {
  it('should load the main page', () => {
    cy.visit('/');
    cy.get('h1').should('be.visible');
  });
});
`;
}

function cypressSupport(): string {
  return `// Cypress E2E support file
// Add custom commands and global configuration here.
`;
}

// ─── Generator ─────────────────────────────────────────────────────

export function createTestingGenerator(): Generator {
  return {
    name: 'testing',
    description: 'Generates testing configuration files and sample tests for the selected testing frameworks',

    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const unitTest = getTech(ctx, 'testing-unit');
      const e2eTest = getTech(ctx, 'testing-e2e');
      const apiTest = getTech(ctx, 'testing-api');

      if (!unitTest && !e2eTest && !apiTest) return { files: [] };

      const files: GeneratedFile[] = [];
      const commands: PostGenCommand[] = [];

      // ── Vitest ──
      if (hasTech(ctx, 'vitest')) {
        files.push({ path: 'backend/vitest.config.ts', content: vitestConfig() });
        files.push({ path: 'backend/tests/items.test.ts', content: vitestSampleTest(ctx) });
      }

      // ── Jest ──
      if (hasTech(ctx, 'jest')) {
        files.push({ path: 'backend/jest.config.ts', content: jestConfig() });
        files.push({ path: 'backend/tests/items.test.ts', content: vitestSampleTest(ctx) });
      }

      // ── Pytest ──
      if (hasTech(ctx, 'pytest')) {
        files.push({ path: 'backend/pytest.ini', content: pytestIni() });
        files.push({ path: 'backend/tests/__init__.py', content: '' });
        files.push({ path: 'backend/tests/test_items.py', content: pytestSampleTest(ctx) });
      }

      // ── Playwright ──
      if (hasTech(ctx, 'playwright')) {
        files.push({ path: 'frontend/playwright.config.ts', content: playwrightConfig() });
        files.push({ path: 'frontend/e2e/home.spec.ts', content: playwrightSampleTest() });
        commands.push({
          command: 'npx playwright install',
          cwd: 'frontend',
          description: 'Install Playwright browsers',
        });
      }

      // ── Cypress ──
      if (hasTech(ctx, 'cypress')) {
        files.push({ path: 'frontend/cypress.config.ts', content: cypressConfig() });
        files.push({ path: 'frontend/cypress/e2e/home.cy.ts', content: cypressSampleTest() });
        files.push({ path: 'frontend/cypress/support/e2e.ts', content: cypressSupport() });
      }

      return { files, commands };
    },
  };
}
