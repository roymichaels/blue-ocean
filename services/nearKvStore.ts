import { assertNearChain } from './chain';
import { initLake } from './nearLake';

assertNearChain();

// Placeholder in-memory store backed by NEAR Lake stream initialization.
// Future implementations can replace this with actual on-chain persistence.
const store: Map<string, Map<string, string>> = new Map();

let lakeStarted = false;
function ensureLake() {
  if (lakeStarted) return;
  // Best-effort start of NEAR Lake; ignore failures so tests can run offline.
  try {
    const bucket = process.env.NEAR_LAKE_BUCKET;
    if (bucket) {
      initLake({
        s3BucketName: bucket,
        s3RegionName: process.env.NEAR_LAKE_REGION || 'eu-central-1',
        startBlockHeight: BigInt(process.env.NEAR_LAKE_START_BLOCK || '0'),
      });
    }
  } catch {
    // ignore
  }
  lakeStarted = true;
}

export async function setValue(address: string, key: string, value: string) {
  ensureLake();
  if (!store.has(address)) {
    store.set(address, new Map());
  }
  const m = store.get(address)!;
  if (value === '') {
    m.delete(key);
  } else {
    m.set(key, value);
  }
}

export async function removeValue(address: string, key: string) {
  ensureLake();
  const m = store.get(address);
  m?.delete(key);
}

export async function getValue(address: string, key: string): Promise<string | null> {
  ensureLake();
  const m = store.get(address);
  return m?.get(key) ?? null;
}

export async function listValues(
  address: string,
): Promise<{ key: string; value: string }[]> {
  ensureLake();
  const m = store.get(address);
  if (!m) return [];
  return Array.from(m.entries()).map(([key, value]) => ({ key, value }));
}

