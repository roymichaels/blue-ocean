# Observability

Blue Ocean services emit structured logs and local metrics. Telemetry remains on
box; there is no Prometheus endpoint or external collector.

## Logging

Service modules use [pino](https://github.com/pinojs/pino) for structured
logging. Logs include the service name and action for each call.

## Metrics

Metrics are stored in-memory via `LocalMetricRegistry` and can be snapshot with
`registry.snapshot()`. Ship the resulting JSON alongside log bundles or over the
existing peer-to-peer channels.

Key metrics:

- `service_latency_ms` – Histogram tracking service call latency.
- `service_failures_total` – Counter of failed service calls.
- `admin_unauthorized_attempts_total` – Counter of unauthorized admin actions.
- `admin_count` – Gauge of currently registered admins.
- `auth_rate_limit_total` – Counter of auth requests rejected by rate limiting.
- `auth_scope_requests_total` – Counter of auth scope checks.
- `auth_invalid_scope_total` – Counter of auth scope checks with invalid scopes.
- `delivery_notifications_backlog` – Gauge tracking queued delivery updates (alerts when > 100).

Use `withMonitoring` from [`services/monitoring.ts`](../services/monitoring.ts) to
wrap asynchronous service calls. The helper records latency, increments the
failure counter on errors and emits structured logs via the shared logger.

### Local Snapshots

```
import { registry } from '@/services/monitoring';

const snapshot = registry.snapshot();
// Persist alongside application logs or broadcast over Waku.
```

## Retry Middleware

Network calls to Waku and NEAR RPC use a retry-with-exponential-backoff helper
defined in [`utils/retry.ts`](../utils/retry.ts).
