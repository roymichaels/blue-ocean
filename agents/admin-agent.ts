import { EventEmitter } from 'events';
import { getValue, setValue } from '@/services/nearKvStore';
import { canonicalJson } from '@/utils/serialization';
import { verifyMessageSignature } from '@/utils/verifyMessageSignature';
import AgentError from '@/types/AgentError';
import type { WakuMessage } from '@/types/waku';
import {
  adminCountGauge,
  adminUnauthorizedAttempts,
  logger as monitoringLogger,
} from '@/services/monitoring';
import flags from '@/utils/flags';
import { publish } from '@/services/waku';
import {
  adminRecoveryTopic,
  type AdminRecoveryEvent,
} from '@/utils/wakuTopics';
import {
  getRecoveryCode,
  saveRecoveryCode,
  removeRecoveryCode,
} from '@/services/recoveryService';
import {
  putGrant,
  getGrant,
  purgeExpired as purgeExpiredGrants,
} from '@/services/adminGrantStore';
import type {
  AdminRecoveryRequestMessage,
  AdminRecoveryVerifyMessage,
} from '@/types/waku';
import uuid from '@/utils/uuid';

// TODO:TODO-105 Add structured audit history for admin approvals and rejections to satisfy compliance requirements.
// TODO:REC-205 Explore moving AdminAgent persistence into a typed repository to avoid repeated manual JSON parsing.

export interface AdminRecord {
  address: string;
  publicKey: string;
  requestedAt?: number;
}

export interface RecoveryCodeRecord {
  id: string;
  tenantId: string;
  targetPublicKey: string;
  deviceId: string;
  approvalsRequired: number;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  lockedUntil?: number;
  requesterPublicKey?: string;
  approvedBy: string[];
  status: 'pending' | 'granted' | 'revoked' | 'expired';
  lastAttemptAt?: number;
  lastVerifiedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface AdminGrant {
  id: string;
  tenantId: string;
  codeId: string;
  deviceId: string;
  targetPublicKey: string;
  issuedAt: number;
  expiresAt: number;
  approvedBy: string[];
  used: boolean;
  usedAt?: number;
  usedBy?: string;
  revoked?: boolean;
  revokedAt?: number;
  revokedBy?: string;
}

const KV_ADDRESS = 'admin-agent';
const ADMINS_KEY = 'admins';
const PENDING_KEY = 'pending';

async function readRecords(key: string): Promise<AdminRecord[]> {
  const raw = await getValue(KV_ADDRESS, key);
  return raw ? (JSON.parse(raw) as AdminRecord[]) : [];
}

async function writeRecords(key: string, records: AdminRecord[]): Promise<void> {
  await setValue(KV_ADDRESS, key, canonicalJson(records));
}

export type AdminAgentEvent =
  | { type: 'admin.registered'; payload: { address: string } }
  | { type: 'admin.requested'; payload: { address: string; requestedAt: number } }
  | { type: 'admin.rejected'; payload: { address: string } }
  | { type: 'recovery.requested'; payload: { tenantId: string; codeId: string; deviceId: string } }
  | { type: 'recovery.failed'; payload: { tenantId: string; codeId?: string; deviceId: string; reason: string } }
  | { type: 'recovery.verified'; payload: { tenantId: string; codeId: string; approvals: number; approvedBy: string[] } }
  | { type: 'recovery.granted'; payload: { tenantId: string; codeId: string; grantId: string; expiresAt: number } }
  | { type: 'recovery.revoked'; payload: { tenantId: string; grantId: string } };

export class AdminAgent extends EventEmitter {
  private static readonly NONCE_TTL_MS = 2 * 60 * 1000;
  private static readonly CLOCK_SKEW_MS = 2 * 60 * 1000;
  private static readonly UNAUTHORIZED_ALERT_WINDOW_MS = 60 * 1000;
  private static readonly UNAUTHORIZED_ALERT_THRESHOLD = 3;
  private static readonly RECOVERY_ATTEMPT_LIMIT = 5;
  private static readonly RECOVERY_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
  private static readonly RECOVERY_LOCKOUT_MS = 30 * 60 * 1000;
  private static readonly RECOVERY_GRANT_TTL_MS = 10 * 60 * 1000;
  private static readonly RECOVERY_GRANT_MAX_TTL_MS = 30 * 60 * 1000;
  private seenNonces = new Map<string, number>();
  private unauthorizedAttemptTimestamps: number[] = [];
  private lastUnauthorizedAlertAt = 0;
  private recoveryAttemptState = new Map<string, { attempts: number[]; lockedUntil?: number }>();

  async getAdmins(): Promise<AdminRecord[]> {
    return await readRecords(ADMINS_KEY);
  }

  async getPendingRequests(): Promise<AdminRecord[]> {
    return await readRecords(PENDING_KEY);
  }

  private purgeNonces(now: number) {
    const cutoff = now - AdminAgent.NONCE_TTL_MS;
    for (const [nonce, ts] of this.seenNonces.entries()) {
      if (ts < cutoff) {
        this.seenNonces.delete(nonce);
      }
    }
  }

  private hasSeenNonce(nonce: string): boolean {
    const now = Date.now();
    this.purgeNonces(now);
    return this.seenNonces.has(nonce);
  }

  private rememberNonce(nonce: string): void {
    const now = Date.now();
    this.purgeNonces(now);
    this.seenNonces.set(nonce, now);
  }

  private recordUnauthorizedAttempt(): void {
    const now = Date.now();
    this.unauthorizedAttemptTimestamps.push(now);
    const cutoff = now - AdminAgent.UNAUTHORIZED_ALERT_WINDOW_MS;
    this.unauthorizedAttemptTimestamps = this.unauthorizedAttemptTimestamps.filter(
      (ts) => ts >= cutoff,
    );
    if (
      this.unauthorizedAttemptTimestamps.length >
        AdminAgent.UNAUTHORIZED_ALERT_THRESHOLD &&
      (this.lastUnauthorizedAlertAt === 0 ||
        now - this.lastUnauthorizedAlertAt >=
          AdminAgent.UNAUTHORIZED_ALERT_WINDOW_MS)
    ) {
      monitoringLogger.warn(
        {
          attempts: this.unauthorizedAttemptTimestamps.length,
          windowMs: AdminAgent.UNAUTHORIZED_ALERT_WINDOW_MS,
        },
        'admin unauthorized attempts threshold exceeded',
      );
      this.lastUnauthorizedAlertAt = now;
    }
  }

  private async addAdmin(record: AdminRecord): Promise<void> {
    const admins = await this.getAdmins();
    admins.push(record);
    await writeRecords(ADMINS_KEY, admins);
    adminCountGauge.set(admins.length);
  }

  private async queueRequest(record: AdminRecord): Promise<void> {
    const pending = await this.getPendingRequests();
    pending.push(record);
    await writeRecords(PENDING_KEY, pending);
  }

  private async removeRequest(address: string): Promise<AdminRecord | null> {
    const pending = await this.getPendingRequests();
    const idx = pending.findIndex((p) => p.address === address);
    if (idx === -1) return null;
    const [rec] = pending.splice(idx, 1);
    await writeRecords(PENDING_KEY, pending);
    return rec;
  }

  private normalizeTenantId(tenantId?: string): string {
    const trimmed = tenantId?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : '1';
  }

  private getRecoveryState(deviceId: string) {
    let state = this.recoveryAttemptState.get(deviceId);
    if (!state) {
      state = { attempts: [] };
      this.recoveryAttemptState.set(deviceId, state);
    }
    return state;
  }

  private pruneRecoveryAttempts(deviceId: string, now: number) {
    const state = this.getRecoveryState(deviceId);
    state.attempts = state.attempts.filter(
      (ts) => now - ts <= AdminAgent.RECOVERY_ATTEMPT_WINDOW_MS,
    );
    if (state.lockedUntil && state.lockedUntil <= now) {
      state.lockedUntil = undefined;
    }
  }

  private ensureRecoveryAllowed(deviceId: string, now: number) {
    const state = this.getRecoveryState(deviceId);
    this.pruneRecoveryAttempts(deviceId, now);
    if (state.lockedUntil && state.lockedUntil > now) {
      throw new AgentError('E_RATE_LIMIT', 'Recovery attempts temporarily locked', 'admin-agent');
    }
  }

  private recordRecoveryAttempt(deviceId: string, now: number, success: boolean) {
    const state = this.getRecoveryState(deviceId);
    this.pruneRecoveryAttempts(deviceId, now);
    if (success) {
      state.attempts = [];
      state.lockedUntil = undefined;
    } else {
      state.attempts.push(now);
      if (state.attempts.length >= AdminAgent.RECOVERY_ATTEMPT_LIMIT) {
        state.lockedUntil = now + AdminAgent.RECOVERY_LOCKOUT_MS;
      }
    }
    this.recoveryAttemptState.set(deviceId, state);
  }

  private async safePublish(topic: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await publish(topic, payload);
    } catch (err) {
      monitoringLogger.warn({ topic, err }, 'failed to publish admin recovery event');
    }
  }

  private async publishRecoveryEvent(
    tenantId: string,
    event: AdminRecoveryEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const topic = adminRecoveryTopic(tenantId, event);
    await this.safePublish(topic, { tenantId, ...payload });
  }

  private async publishRecoveryAttempt(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.publishRecoveryEvent(tenantId, 'attempt', payload);
  }

  async requestAdmin(
    msg: WakuMessage<{ address: string; displayName?: string; nonce: string; ts: number }>,
  ): Promise<AdminAgentEvent['type']> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.joinRequested') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid request type', 'admin-agent');
    }
    if (Math.abs(Date.now() - msg.payload.ts) > AdminAgent.CLOCK_SKEW_MS) {
      throw new AgentError('E_REPLAY', 'Timestamp skew too high', 'admin-agent');
    }
    if (this.hasSeenNonce(msg.payload.nonce)) {
      throw new AgentError('E_REPLAY', 'Nonce already used', 'admin-agent');
    }
    this.rememberNonce(msg.payload.nonce);
    const record: AdminRecord = {
      address: msg.payload.address,
      publicKey: msg.sender.publicKey,
      requestedAt: msg.payload.ts,
    };
    const admins = await this.getAdmins();
    const bootstrapFlag = flags.ADMIN_BOOTSTRAP_V2;
    const normalizedAddress = record.address.toLowerCase();
    const shouldUseV2 =
      !bootstrapFlag.rollback &&
      (bootstrapFlag.enabled || bootstrapFlag.canary.includes(normalizedAddress));
    if (!shouldUseV2) {
      if (!admins.some((a) => a.address === record.address)) {
        await this.addAdmin(record);
      }
      this.emit('admin.registered', { address: record.address });
      return 'admin.registered';
    }
    if (admins.length === 0) {
      await this.addAdmin(record);
      this.emit('admin.registered', { address: record.address });
      return 'admin.registered';
    }
    if (admins.some((a) => a.address === record.address)) {
      throw new AgentError('E_DUPLICATE', 'Admin already registered', 'admin-agent');
    }
    // otherwise queue
    const pending = await this.getPendingRequests();
    if (
      pending.some(
        (p) => p.address === record.address || p.publicKey === record.publicKey,
      )
    ) {
      throw new AgentError('E_DUPLICATE', 'Admin request already pending', 'admin-agent');
    }
    await this.queueRequest(record);
    this.emit('admin.requested', {
      address: record.address,
      requestedAt: record.requestedAt!,
    });
    return 'admin.requested';
  }

  async approveAdmin(
    msg: WakuMessage<{ address: string; nonce: string; ts: number }>,
  ): Promise<'admin.registered'> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.approve') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid approval type', 'admin-agent');
    }
    if (Math.abs(Date.now() - msg.payload.ts) > AdminAgent.CLOCK_SKEW_MS) {
      throw new AgentError('E_REPLAY', 'Timestamp skew too high', 'admin-agent');
    }
    if (this.hasSeenNonce(msg.payload.nonce)) {
      throw new AgentError('E_REPLAY', 'Nonce already used', 'admin-agent');
    }
    this.rememberNonce(msg.payload.nonce);
    const admins = await this.getAdmins();
    const isAdmin = admins.some((a) => a.publicKey === msg.sender.publicKey);
    if (!isAdmin) {
      adminUnauthorizedAttempts.inc();
      this.recordUnauthorizedAttempt();
      throw new AgentError('E_UNAUTHORIZED', 'Only admins can approve', 'admin-agent');
    }
    const pending = await this.removeRequest(msg.payload.address);
    if (pending) {
      await this.addAdmin(pending);
      this.emit('admin.registered', { address: pending.address });
    }
    return 'admin.registered';
  }

  async rejectAdmin(
    msg: WakuMessage<{ address: string; nonce: string; ts: number }>,
  ): Promise<'admin.rejected'> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.reject') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid reject type', 'admin-agent');
    }
    if (Math.abs(Date.now() - msg.payload.ts) > AdminAgent.CLOCK_SKEW_MS) {
      throw new AgentError('E_REPLAY', 'Timestamp skew too high', 'admin-agent');
    }
    if (this.hasSeenNonce(msg.payload.nonce)) {
      throw new AgentError('E_REPLAY', 'Nonce already used', 'admin-agent');
    }
    this.rememberNonce(msg.payload.nonce);
    const admins = await this.getAdmins();
    const isAdmin = admins.some((a) => a.publicKey === msg.sender.publicKey);
    if (!isAdmin) {
      adminUnauthorizedAttempts.inc();
      this.recordUnauthorizedAttempt();
      throw new AgentError('E_UNAUTHORIZED', 'Only admins can reject', 'admin-agent');
    }
    const pending = await this.removeRequest(msg.payload.address);
    if (pending) {
      this.emit('admin.rejected', { address: pending.address });
    }
    return 'admin.rejected';
  }

  private async handleRecoveryFailure(
    tenantId: string,
    deviceId: string,
    reason: string,
    now: number,
    extras: Record<string, unknown> = {},
    codeId?: string,
  ): Promise<void> {
    await this.publishRecoveryAttempt(tenantId, {
      deviceId,
      reason,
      codeId,
      ts: now,
      ...extras,
    });
    this.emit('recovery.failed', { tenantId, deviceId, codeId, reason });
  }

  async requestRecovery(
    msg: WakuMessage<AdminRecoveryRequestMessage['payload']>,
  ): Promise<'recovery.requested'> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.recovery.request') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid recovery request type', 'admin-agent');
    }
    const now = Date.now();
    if (Math.abs(now - msg.payload.ts) > AdminAgent.CLOCK_SKEW_MS) {
      throw new AgentError('E_REPLAY', 'Timestamp skew too high', 'admin-agent');
    }
    if (this.hasSeenNonce(msg.payload.nonce)) {
      throw new AgentError('E_REPLAY', 'Nonce already used', 'admin-agent');
    }
    this.rememberNonce(msg.payload.nonce);
    const tenantId = this.normalizeTenantId(msg.payload.tenantId);
    const deviceId = msg.payload.deviceId;
    this.ensureRecoveryAllowed(deviceId, now);

    const record = await getRecoveryCode(msg.payload.codeId);
    if (!record) {
      this.recordRecoveryAttempt(deviceId, now, false);
      await this.handleRecoveryFailure(tenantId, deviceId, 'missing_code', now, {}, msg.payload.codeId);
      throw new AgentError('E_RECOVERY_INVALID', 'Unknown recovery code', 'admin-agent');
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      this.recordRecoveryAttempt(deviceId, now, false);
      await this.handleRecoveryFailure(
        tenantId,
        deviceId,
        'locked',
        now,
        { lockedUntil: record.lockedUntil },
        record.id,
      );
      throw new AgentError('E_RATE_LIMIT', 'Recovery code locked', 'admin-agent');
    }

    if (record.expiresAt <= now) {
      record.status = 'expired';
      record.lockedUntil = undefined;
      await saveRecoveryCode(record);
      this.recordRecoveryAttempt(deviceId, now, false);
      await this.handleRecoveryFailure(tenantId, deviceId, 'expired', now, {}, record.id);
      throw new AgentError('E_RECOVERY_INVALID', 'Recovery code expired', 'admin-agent');
    }

    if (record.code !== msg.payload.code) {
      record.attempts = (record.attempts ?? 0) + 1;
      if (record.attempts >= AdminAgent.RECOVERY_ATTEMPT_LIMIT) {
        record.lockedUntil = now + AdminAgent.RECOVERY_LOCKOUT_MS;
      }
      record.lastAttemptAt = now;
      await saveRecoveryCode(record);
      this.recordRecoveryAttempt(deviceId, now, false);
      await this.handleRecoveryFailure(
        tenantId,
        deviceId,
        'invalid_code',
        now,
        { attempts: record.attempts },
        record.id,
      );
      throw new AgentError('E_RECOVERY_INVALID', 'Recovery code mismatch', 'admin-agent');
    }

    record.requesterPublicKey = msg.sender.publicKey;
    record.deviceId = deviceId;
    record.approvalsRequired = msg.payload.approvalsRequired ?? record.approvalsRequired;
    record.lastAttemptAt = now;
    record.attempts = 0;
    record.lockedUntil = undefined;
    record.status = 'pending';
    record.metadata = {
      ...record.metadata,
      targetPublicKey: msg.payload.targetPublicKey ?? record.targetPublicKey,
    };
    if (msg.payload.targetPublicKey) {
      record.targetPublicKey = msg.payload.targetPublicKey;
    }
    await saveRecoveryCode(record);

    this.recordRecoveryAttempt(deviceId, now, true);

    await this.publishRecoveryEvent(tenantId, 'request', {
      codeId: record.id,
      deviceId,
      approvalsRequired: record.approvalsRequired,
      requestedBy: msg.sender.publicKey,
      requestedAt: now,
    });
    this.emit('recovery.requested', { tenantId, codeId: record.id, deviceId });
    return 'recovery.requested';
  }

  async verifyRecovery(
    msg: WakuMessage<AdminRecoveryVerifyMessage['payload']>,
  ): Promise<'recovery.verified' | 'recovery.granted'> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.recovery.verify') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid recovery verify type', 'admin-agent');
    }
    const now = Date.now();
    if (Math.abs(now - msg.payload.ts) > AdminAgent.CLOCK_SKEW_MS) {
      throw new AgentError('E_REPLAY', 'Timestamp skew too high', 'admin-agent');
    }
    if (this.hasSeenNonce(msg.payload.nonce)) {
      throw new AgentError('E_REPLAY', 'Nonce already used', 'admin-agent');
    }
    this.rememberNonce(msg.payload.nonce);

    const admins = await this.getAdmins();
    const isAdmin = admins.some((a) => a.publicKey === msg.sender.publicKey);
    if (!isAdmin) {
      adminUnauthorizedAttempts.inc();
      this.recordUnauthorizedAttempt();
      throw new AgentError('E_UNAUTHORIZED', 'Only admins can verify recovery', 'admin-agent');
    }

    const tenantId = this.normalizeTenantId(msg.payload.tenantId);
    const record = await getRecoveryCode(msg.payload.codeId);
    if (!record) {
      await this.handleRecoveryFailure(tenantId, msg.payload.deviceId, 'missing_code', now, {}, msg.payload.codeId);
      throw new AgentError('E_RECOVERY_INVALID', 'Unknown recovery code', 'admin-agent');
    }

    if (record.expiresAt <= now) {
      record.status = 'expired';
      await saveRecoveryCode(record);
      await this.handleRecoveryFailure(tenantId, record.deviceId, 'expired', now, {}, record.id);
      throw new AgentError('E_RECOVERY_INVALID', 'Recovery code expired', 'admin-agent');
    }

    if (record.code !== msg.payload.code) {
      record.attempts = (record.attempts ?? 0) + 1;
      if (record.attempts >= AdminAgent.RECOVERY_ATTEMPT_LIMIT) {
        record.lockedUntil = now + AdminAgent.RECOVERY_LOCKOUT_MS;
      }
      record.lastAttemptAt = now;
      await saveRecoveryCode(record);
      await this.handleRecoveryFailure(tenantId, record.deviceId, 'invalid_code', now, { attempts: record.attempts }, record.id);
      throw new AgentError('E_RECOVERY_INVALID', 'Recovery code mismatch', 'admin-agent');
    }

    if (!record.approvedBy.includes(msg.sender.publicKey)) {
      record.approvedBy = [...record.approvedBy, msg.sender.publicKey];
    }
    record.lastVerifiedAt = now;
    await saveRecoveryCode(record);

    await this.publishRecoveryEvent(tenantId, 'verify', {
      codeId: record.id,
      deviceId: record.deviceId,
      approvals: record.approvedBy.length,
      approvalsRequired: record.approvalsRequired,
      approver: msg.sender.publicKey,
      verifiedAt: now,
    });
    this.emit('recovery.verified', {
      tenantId,
      codeId: record.id,
      approvals: record.approvedBy.length,
      approvedBy: [...record.approvedBy],
    });

    if (record.approvedBy.length >= record.approvalsRequired) {
      await this.createGrant(record, {
        tenantId,
        issuedBy: msg.sender.publicKey,
        now,
        grantTtlMs: msg.payload.grantTtlMs,
      });
      return 'recovery.granted';
    }

    return 'recovery.verified';
  }

  private clampGrantTtl(input?: number): number {
    if (!input || !Number.isFinite(input)) {
      return AdminAgent.RECOVERY_GRANT_TTL_MS;
    }
    return Math.min(Math.max(1, Math.floor(input)), AdminAgent.RECOVERY_GRANT_MAX_TTL_MS);
  }

  private async createGrant(
    record: RecoveryCodeRecord,
    options: { tenantId: string; issuedBy: string; now?: number; grantTtlMs?: number },
  ): Promise<AdminGrant> {
    const now = options.now ?? Date.now();
    const ttl = this.clampGrantTtl(options.grantTtlMs);
    const expiresAt = now + ttl;
    if (!record.deviceId) {
      throw new AgentError('E_RECOVERY_INVALID', 'Recovery request missing device binding', 'admin-agent');
    }
    if (!record.targetPublicKey) {
      throw new AgentError('E_RECOVERY_INVALID', 'Recovery request missing target key', 'admin-agent');
    }
    const grant: AdminGrant = {
      id: uuid(),
      tenantId: options.tenantId,
      codeId: record.id,
      deviceId: record.deviceId,
      targetPublicKey: record.targetPublicKey,
      issuedAt: now,
      expiresAt,
      approvedBy: [...record.approvedBy],
      used: false,
    };
    await putGrant(grant);
    await purgeExpiredGrants(options.tenantId, now);
    record.status = 'granted';
    await saveRecoveryCode(record);
    await this.publishRecoveryEvent(options.tenantId, 'granted', {
      grantId: grant.id,
      codeId: record.id,
      deviceId: record.deviceId,
      approvedBy: grant.approvedBy,
      expiresAt,
      issuedAt: now,
      issuedBy: options.issuedBy,
    });
    this.emit('recovery.granted', {
      tenantId: options.tenantId,
      codeId: record.id,
      grantId: grant.id,
      expiresAt,
    });
    return grant;
  }

  async revokeGrant(
    tenantId: string,
    grantId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<'recovery.revoked'> {
    const normalizedTenant = this.normalizeTenantId(tenantId);
    const grant = await getGrant(normalizedTenant, grantId);
    if (!grant) {
      throw new AgentError('E_NOT_FOUND', 'Grant not found', 'admin-agent');
    }
    if (grant.revoked) {
      return 'recovery.revoked';
    }
    const now = Date.now();
    const updated: AdminGrant = {
      ...grant,
      revoked: true,
      revokedAt: now,
      revokedBy,
    };
    await putGrant(updated);
    await this.publishRecoveryEvent(normalizedTenant, 'revoked', {
      grantId,
      codeId: grant.codeId,
      revokedAt: now,
      revokedBy,
      reason,
    });
    this.emit('recovery.revoked', { tenantId: normalizedTenant, grantId });
    return 'recovery.revoked';
  }

  async handleMessage(msg: WakuMessage<any>): Promise<void> {
    if (!msg || typeof msg !== 'object') return;
    const type = msg.type;
    switch (type) {
      case 'admin.joinRequested':
        await this.requestAdmin(
          msg as WakuMessage<{
            address: string;
            displayName?: string;
            nonce: string;
            ts: number;
          }>,
        );
        break;
      case 'admin.approve':
        await this.approveAdmin(
          msg as WakuMessage<{ address: string; nonce: string; ts: number }>,
        );
        break;
      case 'admin.reject':
        await this.rejectAdmin(
          msg as WakuMessage<{ address: string; nonce: string; ts: number }>,
        );
        break;
      case 'admin.recovery.request':
        await this.requestRecovery(
          msg as WakuMessage<AdminRecoveryRequestMessage['payload']>,
        );
        break;
      case 'admin.recovery.verify':
        await this.verifyRecovery(
          msg as WakuMessage<AdminRecoveryVerifyMessage['payload']>,
        );
        break;
      default:
        break;
    }
  }
}

export default new AdminAgent();
