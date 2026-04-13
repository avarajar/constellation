---
description: Generate or add monitoring setup — observability, logging, error tracking, alerting, and dashboards
---

# Constellation — Monitoring Generation

Generate observability, logging, and error tracking configuration for the project.

## What You Need

Either read from a Constellation blueprint YAML (`stack.monitoring` section), or accept these inputs directly:
- **Observability**: Datadog, New Relic, Grafana, Prometheus
- **Logging**: ELK Stack, Loki, CloudWatch
- **Error tracking**: Sentry, Rollbar

## STEP 0 — MANDATORY: Fetch Latest Versions BEFORE Writing Any Code

**DO NOT SKIP THIS STEP.**

For Node.js SDKs:
```bash
for pkg in @sentry/node dd-trace newrelic pino winston; do
  ver=$(npm view "$pkg" version 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg@$ver"
done
```

For Python SDKs:
```bash
for pkg in sentry-sdk ddtrace newrelic-agent structlog python-json-logger; do
  ver=$(curl -s "https://pypi.org/pypi/$pkg/json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])" 2>/dev/null)
  [ -n "$ver" ] && echo "$pkg==$ver"
done
```

**Use ONLY the fetched versions.**

## What You Generate

### SDK/Client Initialization
- Early initialization in the application entry point
- **Sentry**: `sentry_sdk.init()` or `Sentry.init()` with DSN from env, environment tag, traces sample rate
- **Datadog**: `ddtrace` auto-instrumentation or `dd-trace` init
- **New Relic**: `newrelic.js` config or `newrelic` Python agent config

### Structured Logging
- JSON-formatted logging for production:
  - **Python**: `structlog` with JSON renderer, or `python-json-logger`
  - **Node.js**: `pino` (preferred) or `winston` with JSON transport
  - **Go**: `zerolog` or `zap`
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Request/response logging middleware with:
  - Request ID (UUID per request)
  - Method, path, status code, duration
  - User ID (if authenticated)
- Correlation IDs for tracing across services

### Health & Metrics Endpoints
- `GET /health` — basic health check (returns 200 + uptime, version)
- `GET /health/ready` — readiness check (database connected, cache reachable)
- `GET /metrics` — Prometheus-format metrics (if Prometheus selected):
  - Request count by method/path/status
  - Request duration histogram
  - Active connections
  - Custom business metrics

### Docker Compose Services (self-hosted tools)
- **Prometheus** + **Grafana**:
  - Prometheus with `prometheus.yml` scrape config targeting the backend /metrics endpoint
  - Grafana with provisioned datasource (Prometheus) and dashboard
  - Pre-built dashboard JSON for API metrics
- **Loki** (if selected):
  - Loki service with retention config
  - Promtail sidecar for log collection
  - Grafana datasource for Loki
- **ELK Stack** (if selected):
  - Elasticsearch, Logstash, Kibana services
  - Logstash pipeline config
  - Filebeat config for log shipping

### Alerting Rules
- **Prometheus** (`alerts.yml`):
  - High error rate (>5% 5xx responses in 5 min)
  - High latency (p95 > 1s)
  - Service down (health check failing)
  - High memory usage (>85%)
- **Sentry**: alert rules configured via SDK (performance thresholds, error rate)

### Environment Variable Templates
- `SENTRY_DSN` — Sentry project DSN
- `DD_API_KEY` — Datadog API key
- `DD_ENV` — Environment name
- `NEW_RELIC_LICENSE_KEY` — New Relic license
- `LOG_LEVEL` — Logging level (default: INFO)
- All documented in .env.example with descriptions

## Guidelines

- Initialize monitoring early in the application lifecycle (before routes)
- Use structured logging (JSON) for production, human-readable for development
- Include both development and production configurations
- Error tracking must capture unhandled exceptions automatically
- Self-hosted tools must have Docker Compose services with health checks
- Dashboards should be provisioned automatically (no manual setup)
- Alerting rules should have sensible defaults that won't spam

## Standalone Usage

To add monitoring to an existing project:

1. Ask which monitoring tools the user wants
2. Detect existing framework and language
3. **Run Step 0 to fetch latest versions**
4. Generate initialization code, configs, Docker services, and dashboards
