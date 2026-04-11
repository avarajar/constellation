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

## What You Generate

- SDK/client initialization code for chosen services
- Configuration files (sentry.properties, datadog.yaml, etc.)
- Structured logging setup with appropriate log levels
- Health/metrics endpoint exposure (if Prometheus)
- Docker Compose services for self-hosted tools
- Environment variable templates for API keys/DSNs

## Guidelines

- Initialize monitoring early in the application lifecycle
- Use structured logging (JSON) for production
- Include both development and production configurations
- Error tracking should capture unhandled exceptions automatically

## Standalone Usage

To add monitoring to an existing project:

1. Ask which monitoring tools the user wants
2. Detect existing framework and language
3. Generate initialization code and configs
