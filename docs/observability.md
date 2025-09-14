# Observability

Blue Ocean services emit structured logs and Prometheus metrics.

## Logging

Service modules use [pino](https://github.com/pinojs/pino) for structured logging. Logs include the service name and action for each call.

## Metrics

Metrics are exposed on `http://localhost:9464/metrics` by default. Set `METRICS_PORT` to change the port.

Key metrics:

- `service_latency_seconds` – Histogram tracking service call latency.
- `service_failures_total` – Counter of failed service calls.
- `admin_unauthorized_attempts_total` – Counter of unauthorized admin actions.
- `admin_count` – Gauge of currently registered admins.

Prometheus alert thresholds are provided in [`scripts/monitoring/alerts.yml`](../scripts/monitoring/alerts.yml) for latency and failure rates.

## Service Hooks

Use `withMonitoring` from [`services/monitoring.ts`](../services/monitoring.ts) to wrap asynchronous service calls. The helper records latency, increments the failure counter on errors and emits structured logs via the shared logger.

## Retry Middleware

Network calls to Waku and NEAR RPC use a retry-with-exponential-backoff helper defined in [`utils/retry.ts`](../utils/retry.ts).

