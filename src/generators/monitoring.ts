/**
 * Monitoring configuration generator.
 * Handles: Prometheus, Grafana, Datadog, Sentry, Pino, Winston, ELK.
 */
import type {
  Generator,
  GeneratorContext,
  GeneratorResult,
  GeneratedFile,
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

// ─── Prometheus ────────────────────────────────────────────────────

function prometheusConfig(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: '${name}-backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/metrics'
    scrape_interval: 10s
`;
}

function prometheusMetricsMiddleware(): string {
  return `import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});
`;
}

// ─── Grafana ───────────────────────────────────────────────────────

function grafanaDashboard(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return JSON.stringify(
    {
      dashboard: {
        title: `${name} Dashboard`,
        panels: [
          {
            title: 'Request Rate',
            type: 'timeseries',
            targets: [
              {
                expr: 'rate(http_requests_total[5m])',
                legendFormat: '{{method}} {{route}}',
              },
            ],
            gridPos: { h: 8, w: 12, x: 0, y: 0 },
          },
          {
            title: 'Request Duration (p95)',
            type: 'timeseries',
            targets: [
              {
                expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
                legendFormat: '{{route}}',
              },
            ],
            gridPos: { h: 8, w: 12, x: 12, y: 0 },
          },
          {
            title: 'Error Rate',
            type: 'stat',
            targets: [
              {
                expr: 'sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
              },
            ],
            gridPos: { h: 4, w: 6, x: 0, y: 8 },
          },
        ],
        time: { from: 'now-1h', to: 'now' },
        refresh: '10s',
      },
    },
    null,
    2,
  );
}

function grafanaDatasource(): string {
  return `apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
`;
}

// ─── Sentry ────────────────────────────────────────────────────────

function sentryNodeSetup(): string {
  return `import * as Sentry from '@sentry/node';

export function initSentry(): void {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  });
}
`;
}

function sentryBrowserSetup(): string {
  return `import * as Sentry from '@sentry/browser';

export function initSentry(): void {
  Sentry.init({
    dsn: import.meta.env['VITE_SENTRY_DSN'],
    environment: import.meta.env['MODE'],
    tracesSampleRate: import.meta.env['PROD'] ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
`;
}

// ─── Pino ──────────────────────────────────────────────────────────

function pinoLogger(): string {
  return `import pino from 'pino';

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: {
    service: process.env['SERVICE_NAME'] ?? 'app',
  },
});
`;
}

// ─── Winston ───────────────────────────────────────────────────────

function winstonLogger(): string {
  return `import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    process.env['NODE_ENV'] === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.simple()),
  ),
  defaultMeta: { service: process.env['SERVICE_NAME'] ?? 'app' },
  transports: [new transports.Console()],
});
`;
}

// ─── Generator ─────────────────────────────────────────────────────

export function createMonitoringGenerator(): Generator {
  return {
    name: 'monitoring',
    description: 'Generates monitoring, logging, and observability configuration files',

    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const observability = getTech(ctx, 'observability');
      const logging = getTech(ctx, 'logging');
      const errorTracking = getTech(ctx, 'error-tracking');

      if (!observability && !logging && !errorTracking) return { files: [] };

      const files: GeneratedFile[] = [];

      // ── Prometheus ──
      if (hasTech(ctx, 'prometheus')) {
        files.push({ path: 'monitoring/prometheus/prometheus.yml', content: prometheusConfig(ctx) });
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/metrics.ts', content: prometheusMetricsMiddleware() });
        }
      }

      // ── Grafana ──
      if (hasTech(ctx, 'grafana')) {
        files.push({
          path: 'monitoring/grafana/dashboards/app.json',
          content: grafanaDashboard(ctx),
        });
        files.push({
          path: 'monitoring/grafana/provisioning/datasources/datasource.yml',
          content: grafanaDatasource(),
        });
      }

      // ── Sentry ──
      if (hasTech(ctx, 'sentry')) {
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/sentry.ts', content: sentryNodeSetup() });
        }
        if (getTech(ctx, 'frontend')) {
          files.push({ path: 'frontend/src/sentry.ts', content: sentryBrowserSetup() });
        }
      }

      // ── Pino ──
      if (hasTech(ctx, 'pino')) {
        files.push({ path: 'backend/src/logger.ts', content: pinoLogger() });
      }

      // ── Winston ──
      if (hasTech(ctx, 'winston')) {
        files.push({ path: 'backend/src/logger.ts', content: winstonLogger() });
      }

      return { files };
    },
  };
}
