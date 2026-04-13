---
description: Generate or add monitoring setup — observability, logging, and error tracking configuration
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
npm view @sentry/node version
npm view dd-trace version
npm view newrelic version
```

For Python SDKs:
```bash
curl -s https://pypi.org/pypi/sentry-sdk/json | python3 -c "import sys,json; print('sentry-sdk:', json.load(sys.stdin)['info']['version'])"
curl -s https://pypi.org/pypi/ddtrace/json | python3 -c "import sys,json; print('ddtrace:', json.load(sys.stdin)['info']['version'])"
```

**Use ONLY the fetched versions.**

## What You Generate

- SDK/client initialization code for chosen services
- Configuration files (sentry.properties, datadog.yaml, etc.)
- Structured logging setup with appropriate log levels
- Health/metrics endpoint exposure (if Prometheus)
- Docker Compose services for self-hosted tools (Grafana, Prometheus, Loki, ELK)
- Dashboard configuration files (Grafana JSON dashboards if applicable)
- Environment variable templates for API keys/DSNs
- Alerting rules (if Prometheus/Grafana)

## Guidelines

- Initialize monitoring early in the application lifecycle
- Use structured logging (JSON) for production
- Include both development and production configurations
- Error tracking must capture unhandled exceptions automatically
- Self-hosted tools should have Docker Compose services with health checks

## Standalone Usage

To add monitoring to an existing project:

1. Ask which monitoring tools the user wants
2. Detect existing framework and language
3. **Run Step 0 to fetch latest versions**
4. Generate initialization code, configs, and Docker services
