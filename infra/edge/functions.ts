import { sha256 } from '@noble/hashes/sha256';
import { LocalMetricRegistry } from '@/utils/localMetrics';
import { createZeroTrustFunction } from './zeroTrust';
import type { ZeroTrustRuntime } from './types';
import { VaultClient } from './vaultClient';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hashValue(value: string): string {
  return toHex(sha256(value));
}

const functionMetrics = new LocalMetricRegistry({ anonymizeLabels: true });

const inventoryEvents = functionMetrics.createCounter({
  name: 'edge_inventory_events_total',
  help: 'Inventory updates processed at the edge',
  labelNames: ['source'],
});

const orderStatusLatency = functionMetrics.createHistogram({
  name: 'edge_order_check_latency_ms',
  help: 'Latency for anonymized order verification at the edge',
  labelNames: ['result'],
});

const auditBatches = functionMetrics.createCounter({
  name: 'edge_audit_batches_total',
  help: 'Audit batches accepted for replication',
  labelNames: ['origin'],
});

const auditPending = functionMetrics.createGauge({
  name: 'edge_audit_backlog',
  help: 'Most recent batch size for audit replication',
});

export function buildVaultClientFromEnv(env: NodeJS.ProcessEnv = process.env): VaultClient {
  const baseUrl = env.VAULT_ADDR ?? env.VAULT_ADDRESS ?? 'http://127.0.0.1:8200';
  const token = env.VAULT_TOKEN;
  if (!token) {
    throw new Error('VAULT_TOKEN is required to initialise the edge vault client');
  }
  return new VaultClient({
    baseUrl,
    token,
    mountPath: env.VAULT_EDGE_MOUNT ?? env.VAULT_MOUNT_PATH ?? 'secret',
    namespace: env.VAULT_NAMESPACE,
  });
}

export function buildEdgeFunctions(vault: VaultClient): ZeroTrustRuntime[] {
  return [
    createZeroTrustFunction(
      {
        name: 'inventory-webhook',
        description: 'Synchronises upstream inventory deltas at the edge.',
        handler: async ({ request, logger, auth }) => {
          const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const source = typeof payload.source === 'string' ? payload.source : 'unknown';
          inventoryEvents.inc({ source });
          const sku = typeof payload.sku === 'string' ? payload.sku : 'unknown';
          const delta = typeof payload.delta === 'number' ? payload.delta : 0;
          logger.info(
            {
              key: auth.keyId,
              sku: hashValue(sku),
              delta,
            },
            'edge inventory delta accepted',
          );
          return new Response(
            JSON.stringify({ acknowledged: true, processedBy: auth.keyId }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          );
        },
      },
      { vault, metrics: functionMetrics },
    ),
    createZeroTrustFunction(
      {
        name: 'order-status',
        description: 'Validates order status requests without exposing customer data.',
        handler: async ({ request, logger, auth }) => {
          const started = Date.now();
          const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
          const status = typeof payload.status === 'string' ? payload.status : 'unknown';
          const derivedStatus = status.toLowerCase();
          const result = ['fulfilled', 'delivered', 'canceled'].includes(derivedStatus)
            ? derivedStatus
            : 'unknown';
          orderStatusLatency.observe({ result }, Date.now() - started);
          logger.info(
            {
              key: auth.keyId,
              order: hashValue(orderId),
              result,
            },
            'edge order status evaluated',
          );
          return new Response(
            JSON.stringify({ result, processedAt: Date.now() }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          );
        },
      },
      { vault, metrics: functionMetrics },
    ),
    createZeroTrustFunction(
      {
        name: 'audit-stream',
        description: 'Streams anonymised audit batches for local reconciliation.',
        handler: async ({ request, logger, auth }) => {
          const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const origin = typeof payload.origin === 'string' ? payload.origin : 'unknown';
          const events = Array.isArray(payload.events) ? payload.events : [];
          auditBatches.inc({ origin });
          auditPending.set(events.length);
          logger.info(
            {
              key: auth.keyId,
              origin: hashValue(origin),
              batchSize: events.length,
            },
            'edge audit batch accepted',
          );
          return new Response(
            JSON.stringify({ accepted: events.length }),
            {
              status: 202,
              headers: { 'content-type': 'application/json' },
            },
          );
        },
      },
      { vault, metrics: functionMetrics },
    ),
  ];
}

export { functionMetrics, inventoryEvents, orderStatusLatency, auditBatches, auditPending };
