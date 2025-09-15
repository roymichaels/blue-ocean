import { VaultClient } from './vaultClient';
import type { RotationResult, RotationTarget, VaultKeyRecord } from './types';

const DEFAULT_LEAD_TIME_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_RETIRED = 5;
const DEFAULT_GRACE_MS = 2 * 60 * 1000; // 2 minutes of overlap for verification

function clone(record: VaultKeyRecord | null): VaultKeyRecord | null {
  if (!record) return null;
  return {
    ...record,
    metadata: record.metadata ? { ...record.metadata } : undefined,
  };
}

export async function rotateEdgeKeys(
  vault: VaultClient,
  targets: RotationTarget[],
  now = new Date(),
): Promise<RotationResult[]> {
  const results: RotationResult[] = [];
  for (const target of targets) {
    const notes: string[] = [];
    const ring = await vault.readKeyRing(target.functionName);
    const gracePeriodMs = target.gracePeriodMs ?? DEFAULT_GRACE_MS;
    const rotationIntervalMs = Math.max(target.rotationIntervalMs, 60_000);
    const activationLeadTime = Math.max(
      target.activationLeadTimeMs ?? DEFAULT_LEAD_TIME_MS,
      30_000,
    );
    const maxRetired = target.maxRetired ?? DEFAULT_MAX_RETIRED;

    let changed = false;
    let promotedKeyId: string | undefined;
    let generatedKeyId: string | undefined;
    let pendingKeyId: string | undefined;

    const nowMs = now.getTime();

    if (ring.pending) {
      const activationTime = new Date(ring.pending.activateAt).getTime();
      if (activationTime <= nowMs) {
        if (ring.active) {
          const retired: VaultKeyRecord = {
            ...ring.active,
            status: 'retired',
            expiresAt: new Date(nowMs + gracePeriodMs).toISOString(),
          };
          ring.retired = [retired, ...ring.retired.filter((item) => item.id !== retired.id)];
          notes.push(`retired key ${ring.active.id}`);
        }
        ring.active = {
          ...ring.pending,
          status: 'active',
        };
        ring.pending = null;
        promotedKeyId = ring.active.id;
        notes.push(`promoted pending key ${promotedKeyId}`);
        changed = true;
      }
    }

    if (!ring.active) {
      const newActive = vault.createKeyRecord(
        'active',
        now,
        rotationIntervalMs,
        0,
        target.metadata,
      );
      ring.active = newActive;
      generatedKeyId = newActive.id;
      notes.push(`generated new active key ${generatedKeyId}`);
      changed = true;
    }

    if (!ring.pending) {
      const activeExpires = new Date(ring.active.expiresAt).getTime();
      const timeUntilExpiry = activeExpires - nowMs;
      if (timeUntilExpiry <= activationLeadTime) {
        const newPending = vault.createKeyRecord(
          'pending',
          now,
          rotationIntervalMs,
          activationLeadTime,
          target.metadata,
        );
        ring.pending = newPending;
        pendingKeyId = newPending.id;
        notes.push(`scheduled pending key ${pendingKeyId}`);
        changed = true;
      }
    } else {
      const activeExpires = new Date(ring.active.expiresAt).getTime();
      const pendingActivation = new Date(ring.pending.activateAt).getTime();
      if (pendingActivation > activeExpires) {
        // Ensure the pending key activates before the active one expires
        ring.pending = {
          ...ring.pending,
          activateAt: new Date(Math.max(nowMs + 30_000, activeExpires - activationLeadTime)).toISOString(),
          expiresAt: new Date(activeExpires + rotationIntervalMs).toISOString(),
        };
        notes.push(`adjusted pending activation for ${ring.pending.id}`);
        changed = true;
      }
    }

    if (ring.retired.length > maxRetired) {
      const removed = ring.retired.splice(maxRetired);
      if (removed.length > 0) {
        notes.push(`pruned ${removed.length} retired keys`);
        changed = true;
        const result = removed.length;
        results.push({
          functionName: target.functionName,
          changed: true,
          promotedKeyId,
          generatedKeyId,
          pendingKeyId,
          retiredKeysPruned: result,
          notes,
        });
        await vault.writeKeyRing(target.functionName, {
          active: clone(ring.active),
          pending: clone(ring.pending),
          retired: ring.retired.map((item) => clone(item)).filter(Boolean) as VaultKeyRecord[],
          updatedAt: now.toISOString(),
        });
        continue;
      }
    }

    if (changed) {
      await vault.writeKeyRing(target.functionName, {
        active: clone(ring.active),
        pending: clone(ring.pending),
        retired: ring.retired.map((item) => clone(item)).filter(Boolean) as VaultKeyRecord[],
        updatedAt: now.toISOString(),
      });
    }

    results.push({
      functionName: target.functionName,
      changed,
      promotedKeyId,
      generatedKeyId,
      pendingKeyId,
      retiredKeysPruned: 0,
      notes,
    });
  }
  return results;
}
