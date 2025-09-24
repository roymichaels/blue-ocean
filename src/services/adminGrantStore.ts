import type { AdminGrant } from '@/agents/admin-agent';
import { getValue, setValue, removeValue } from './nearKvStore';
import { canonicalJson } from '@/utils/serialization';

const KV_ADDRESS = 'admin-grants';
const GRANT_PREFIX = 'admin:grants';
const INDEX_SUFFIX = 'index';
const USED_RETENTION_MS = 60 * 60 * 1000; // 1 hour retention after use

function grantKey(tenantId: string, grantId: string): string {
  return `${GRANT_PREFIX}:${tenantId}:${grantId}`;
}

function indexKey(tenantId: string): string {
  return `${GRANT_PREFIX}:${tenantId}:${INDEX_SUFFIX}`;
}

async function readIndex(tenantId: string): Promise<string[]> {
  const raw = await getValue(KV_ADDRESS, indexKey(tenantId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(tenantId: string, ids: string[]): Promise<void> {
  await setValue(KV_ADDRESS, indexKey(tenantId), canonicalJson(Array.from(new Set(ids))));
}

export async function putGrant(grant: AdminGrant): Promise<void> {
  const payload = canonicalJson(grant);
  await setValue(KV_ADDRESS, grantKey(grant.tenantId, grant.id), payload);
  const index = await readIndex(grant.tenantId);
  if (!index.includes(grant.id)) {
    index.push(grant.id);
    await writeIndex(grant.tenantId, index);
  }
}

export async function getGrant(
  tenantId: string,
  grantId: string,
): Promise<AdminGrant | null> {
  const raw = await getValue(KV_ADDRESS, grantKey(tenantId, grantId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminGrant;
  } catch {
    return null;
  }
}

export async function markGrantUsed(
  tenantId: string,
  grantId: string,
  meta: { usedAt?: number; usedBy?: string } = {},
): Promise<AdminGrant | null> {
  const grant = await getGrant(tenantId, grantId);
  if (!grant) return null;
  if (grant.used) return grant;
  const next: AdminGrant = {
    ...grant,
    used: true,
    usedAt: meta.usedAt ?? Date.now(),
    usedBy: meta.usedBy ?? grant.usedBy,
  };
  await putGrant(next);
  return next;
}

export async function purgeExpired(
  tenantId: string,
  now = Date.now(),
): Promise<void> {
  const index = await readIndex(tenantId);
  if (index.length === 0) return;
  const next: string[] = [];
  for (const id of index) {
    const grant = await getGrant(tenantId, id);
    if (!grant) continue;
    const expired = grant.expiresAt <= now;
    const revokeExpired = grant.revoked && (!!grant.revokedAt && grant.revokedAt + USED_RETENTION_MS <= now);
    const usedExpired = grant.used && (!!grant.usedAt && grant.usedAt + USED_RETENTION_MS <= now);
    if (expired || revokeExpired || usedExpired) {
      await removeValue(KV_ADDRESS, grantKey(tenantId, id));
      continue;
    }
    next.push(id);
  }
  await writeIndex(tenantId, next);
}

