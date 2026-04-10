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

// ─── Datadog ──────────────────────────────────────────────────────

function datadogAgentConfig(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `api_key: \${DD_API_KEY}
site: datadoghq.com
hostname: ${name}
logs_enabled: true
apm_config:
  enabled: true
  apm_non_local_traffic: true
process_config:
  enabled: true
`;
}

function datadogTraceSetup(): string {
  return `import tracer from 'dd-trace';

tracer.init({
  service: process.env['DD_SERVICE'] ?? 'app',
  env: process.env['DD_ENV'] ?? process.env['NODE_ENV'] ?? 'development',
  version: process.env['DD_VERSION'] ?? '1.0.0',
  logInjection: true,
  runtimeMetrics: true,
});

export default tracer;
`;
}

// ─── New Relic ─────────────────────────────────────────────────────

function newRelicConfig(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || '${name}'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',
  logging: {
    level: 'info',
  },
  distributed_tracing: {
    enabled: true,
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },
};
`;
}

function newRelicSetup(): string {
  return `import newrelic from 'newrelic';

export function recordCustomEvent(eventType: string, attributes: Record<string, unknown>): void {
  newrelic.recordCustomEvent(eventType, attributes);
}

export function noticeError(error: Error, customAttributes?: Record<string, unknown>): void {
  newrelic.noticeError(error, customAttributes);
}

export function startSegment<T>(name: string, record: boolean, handler: () => T): T {
  return newrelic.startSegment(name, record, handler);
}

export default newrelic;
`;
}

// ─── ELK Stack ────────────────────────────────────────────────────

function elkDockerCompose(): string {
  return `services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.17.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.17.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline:ro
    ports:
      - "5044:5044"
      - "9600:9600"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.17.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.17.0
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/log:/var/log:ro
    depends_on:
      - elasticsearch
      - logstash

volumes:
  elasticsearch-data:
`;
}

function filebeatConfig(): string {
  return `filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/*.log
    json.keys_under_root: true
    json.add_error_key: true

  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log

output.logstash:
  hosts: ["logstash:5044"]

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
`;
}

function elkLoggerHelper(): string {
  return `import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env['ELASTICSEARCH_URL'] ?? 'http://localhost:9200',
});

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export async function sendLog(entry: LogEntry): Promise<void> {
  await client.index({
    index: \`logs-\${new Date().toISOString().slice(0, 10)}\`,
    document: {
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    },
  });
}

export async function queryLogs(
  service: string,
  level?: string,
  from?: string,
  size = 100,
): Promise<unknown> {
  const must: Record<string, unknown>[] = [{ match: { service } }];
  if (level) must.push({ match: { level } });
  if (from) must.push({ range: { timestamp: { gte: from } } });

  const result = await client.search({
    index: 'logs-*',
    query: { bool: { must } },
    size,
    sort: [{ timestamp: { order: 'desc' } }],
  });

  return result.hits.hits;
}
`;
}

// ─── Loki ─────────────────────────────────────────────────────────

function lokiDockerCompose(): string {
  return `services:
  loki:
    image: grafana/loki:3.3.0
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:3.3.0
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki

volumes:
  loki-data:
`;
}

function promtailConfig(): string {
  return `server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*.log

  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containers
          __path__: /var/lib/docker/containers/*/*.log
`;
}

function lokiLoggerIntegration(): string {
  return `const LOKI_URL = process.env['LOKI_URL'] ?? 'http://localhost:3100';

export interface LokiLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  labels?: Record<string, string>;
}

export async function pushToLoki(entry: LokiLogEntry): Promise<void> {
  const labels = {
    level: entry.level,
    ...entry.labels,
  };

  const labelString = Object.entries(labels)
    .map(([k, v]) => \`\${k}="\${v}"\`)
    .join(', ');

  const payload = {
    streams: [
      {
        stream: labels,
        values: [[String(Date.now() * 1_000_000), entry.message]],
      },
    ],
  };

  await fetch(\`\${LOKI_URL}/loki/api/v1/push\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function createLokiLogger(defaultLabels: Record<string, string> = {}) {
  return {
    debug: (message: string) => pushToLoki({ level: 'debug', message, labels: defaultLabels }),
    info: (message: string) => pushToLoki({ level: 'info', message, labels: defaultLabels }),
    warn: (message: string) => pushToLoki({ level: 'warn', message, labels: defaultLabels }),
    error: (message: string) => pushToLoki({ level: 'error', message, labels: defaultLabels }),
  };
}
`;
}

// ─── CloudWatch ───────────────────────────────────────────────────

function cloudwatchSetup(): string {
  return `import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

const client = new CloudWatchLogsClient({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
});

const LOG_GROUP = process.env['CLOUDWATCH_LOG_GROUP'] ?? '/app/logs';
const LOG_STREAM = process.env['CLOUDWATCH_LOG_STREAM'] ?? \`app-\${Date.now()}\`;

let sequenceToken: string | undefined;
let initialized = false;

async function ensureLogGroup(): Promise<void> {
  if (initialized) return;
  try {
    await client.send(new CreateLogGroupCommand({ logGroupName: LOG_GROUP }));
  } catch {
    // Group may already exist
  }
  try {
    await client.send(
      new CreateLogStreamCommand({ logGroupName: LOG_GROUP, logStreamName: LOG_STREAM }),
    );
  } catch {
    // Stream may already exist
  }
  initialized = true;
}

export async function logToCloudWatch(
  message: string,
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO',
): Promise<void> {
  await ensureLogGroup();

  const command = new PutLogEventsCommand({
    logGroupName: LOG_GROUP,
    logStreamName: LOG_STREAM,
    sequenceToken,
    logEvents: [
      {
        timestamp: Date.now(),
        message: JSON.stringify({ level, message, timestamp: new Date().toISOString() }),
      },
    ],
  });

  const response = await client.send(command);
  sequenceToken = response.nextSequenceToken;
}

export function createCloudWatchLogger(service: string) {
  const log = (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG') => (message: string) =>
    logToCloudWatch(\`[\${service}] \${message}\`, level);

  return {
    debug: log('DEBUG'),
    info: log('INFO'),
    warn: log('WARN'),
    error: log('ERROR'),
  };
}
`;
}

// ─── Rollbar ──────────────────────────────────────────────────────

function rollbarSetup(): string {
  return `import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: process.env['ROLLBAR_ACCESS_TOKEN'],
  environment: process.env['NODE_ENV'] ?? 'development',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: process.env['CODE_VERSION'] ?? '1.0.0',
      },
    },
  },
});

export function initRollbar(): Rollbar {
  return rollbar;
}

export function reportError(error: Error, extra?: Record<string, unknown>): void {
  rollbar.error(error, extra);
}

export function reportWarning(message: string, extra?: Record<string, unknown>): void {
  rollbar.warning(message, extra);
}

export function reportInfo(message: string, extra?: Record<string, unknown>): void {
  rollbar.info(message, extra);
}

export default rollbar;
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

      // ── Datadog ──
      if (hasTech(ctx, 'datadog')) {
        files.push({ path: 'monitoring/datadog/datadog.yaml', content: datadogAgentConfig(ctx) });
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/monitoring/datadog.ts', content: datadogTraceSetup() });
        }
      }

      // ── New Relic ──
      if (hasTech(ctx, 'new-relic')) {
        files.push({ path: 'newrelic.js', content: newRelicConfig(ctx) });
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/monitoring/newrelic.ts', content: newRelicSetup() });
        }
      }

      // ── ELK Stack ──
      if (hasTech(ctx, 'elk-stack')) {
        files.push({ path: 'monitoring/elk/docker-compose.yml', content: elkDockerCompose() });
        files.push({ path: 'monitoring/elk/filebeat.yml', content: filebeatConfig() });
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/logging/elk.ts', content: elkLoggerHelper() });
        }
      }

      // ── Loki ──
      if (hasTech(ctx, 'loki')) {
        files.push({ path: 'monitoring/loki/docker-compose.yml', content: lokiDockerCompose() });
        files.push({ path: 'monitoring/loki/promtail-config.yml', content: promtailConfig() });
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/logging/loki.ts', content: lokiLoggerIntegration() });
        }
      }

      // ── CloudWatch ──
      if (hasTech(ctx, 'cloudwatch')) {
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/logging/cloudwatch.ts', content: cloudwatchSetup() });
        }
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

      // ── Rollbar ──
      if (hasTech(ctx, 'rollbar')) {
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/src/rollbar.ts', content: rollbarSetup() });
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
