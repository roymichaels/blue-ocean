# Observability

Blue Ocean services emit structured logs and Prometheus metrics.

## Logging

Service modules use [pino](https://github.com/pinojs/pino) for structured logging. Logs include the service name and action for each call.

## Metrics

Metrics are exposed on `http://localhost:9464/metrics` by default. Set `METRICS_PORT` to change the port.

Two metrics are exported:

- `service_latency_seconds` – Histogram tracking service call latency.
- `service_failures_total` – Counter of failed service calls.

Prometheus alert thresholds are provided in [`scripts/monitoring/alerts.yml`](../scripts/monitoring/alerts.yml) for latency and failure rates.

## Retry Middleware

Network calls to Waku and NEAR RPC use a retry-with-exponential-backoff helper defined in [`utils/retry.ts`](../utils/retry.ts).

