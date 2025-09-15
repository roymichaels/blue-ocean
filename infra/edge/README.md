# Edge Zero-Trust Functions

The `infra/edge` package provisions edge-deployed functions protected by
per-request HMAC authentication. Keys are sourced exclusively from a Vault
instance and rotated automatically; the functions never persist secrets to disk
or forward telemetry to a central collector.

## Request Authentication

Edge callers must sign every request. The handler verifies the following
headers:

- `Authorization: Edge <keyId>:<signature>` – signature is the base64 encoded
  HMAC-SHA256 over the canonical request string.
- `X-Edge-Timestamp` – millisecond Unix timestamp. Requests older than the
  allowed skew (default 30 seconds) are rejected.
- `X-Edge-Nonce` – unique nonce for replay prevention. Reuse triggers
  `edge_nonce_reuse_total`.
- `X-Edge-Digest` – hex encoded SHA-256 digest of the request body.

The canonical string is assembled as:

```
<UPPERCASE_METHOD>\n<pathname+search>\n<timestamp>\n<nonce>\n<hex_digest>
```

If any component fails validation the request is rejected locally with a 401
response and the failure is recorded in the `edge_auth_failures_total` metric.

## Key Rotation

`keyRotation.ts` exposes `rotateEdgeKeys`, which promotes pending keys to active
status, retires old keys with a configurable grace window and creates new
pending keys ahead of expiry. All key material is generated in-memory and
written straight to Vault using the `VaultClient`; no secrets are persisted
elsewhere.

Example rotation task:

```ts
import { rotateEdgeKeys, VaultClient } from './infra/edge';

const vault = new VaultClient({
  baseUrl: process.env.VAULT_ADDR!,
  token: process.env.VAULT_TOKEN!,
});

await rotateEdgeKeys(vault, [
  { functionName: 'inventory-webhook', rotationIntervalMs: 60 * 60 * 1000 },
  { functionName: 'order-status', rotationIntervalMs: 30 * 60 * 1000 },
]);
```

Vault paths are namespaced as `secret/data/edge/<functionName>` by default.
Pass `mountPath` or `namespace` when constructing the client to adapt to custom
Vault layouts.

## Edge Functions

`functions.ts` registers three hardened edge handlers:

- `inventory-webhook` – reconciles inventory deltas from upstream sensors.
- `order-status` – resolves anonymised order status checks.
- `audit-stream` – ingests audit batches for local persistence.

Use `buildVaultClientFromEnv` and `buildEdgeFunctions` to bootstrap a runtime:

```ts
import { buildVaultClientFromEnv, buildEdgeFunctions } from './infra/edge';

const vault = buildVaultClientFromEnv();
export const handlers = buildEdgeFunctions(vault);
```

Each function receives a `pino` logger scoped to the function name and the
shared `LocalMetricRegistry`. Metrics remain local and anonymised; there is no
central Prometheus endpoint. Snapshots can be retrieved via
`getEdgeMetricsRegistry().snapshot()` and shipped alongside existing log files.

## Metrics & Logging

The local registry produces anonymised counters, gauges and histograms. Use
`utils/localMetrics.ts` to snapshot metrics and flush them into log storage or
peer-to-peer channels. Centralised telemetry and Prometheus alert rules have
been removed in favour of local logs and privacy-preserving aggregates.
