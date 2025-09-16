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

interface AdminRecord {
  address: string;
  publicKey: string;
  requestedAt?: number;
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
  | { type: 'admin.requested'; payload: { address: string; requestedAt: number } };

export class AdminAgent extends EventEmitter {
  private static readonly SIGNATURE_CACHE_TTL = 10 * 60 * 1000;
  private static readonly UNAUTHORIZED_ALERT_WINDOW_MS = 60 * 1000;
  private static readonly UNAUTHORIZED_ALERT_THRESHOLD = 3;

  private seenSignatures = new Map<string, number>();
  private unauthorizedAttemptTimestamps: number[] = [];
  private lastUnauthorizedAlertAt = 0;

  async getAdmins(): Promise<AdminRecord[]> {
    return await readRecords(ADMINS_KEY);
  }

  async getPendingRequests(): Promise<AdminRecord[]> {
    return await readRecords(PENDING_KEY);
  }

  private purgeSignatures(now: number) {
    const cutoff = now - AdminAgent.SIGNATURE_CACHE_TTL;
    for (const [sig, ts] of this.seenSignatures.entries()) {
      if (ts < cutoff) {
        this.seenSignatures.delete(sig);
      }
    }
  }

  private hasSeenSignature(signature: string): boolean {
    const now = Date.now();
    this.purgeSignatures(now);
    return this.seenSignatures.has(signature.toLowerCase());
  }

  private rememberSignature(signature: string): void {
    const now = Date.now();
    this.purgeSignatures(now);
    this.seenSignatures.set(signature.toLowerCase(), now);
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

  async requestAdmin(
    msg: WakuMessage<{ address: string; requestedAt?: number }>,
  ): Promise<AdminAgentEvent['type']> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.joinRequested') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid request type', 'admin-agent');
    }
    if (this.hasSeenSignature(msg.signature)) {
      throw new AgentError('E_DUPLICATE', 'Admin request already processed', 'admin-agent');
    }
    this.rememberSignature(msg.signature);
    const record: AdminRecord = {
      address: msg.payload.address,
      publicKey: msg.sender.publicKey,
      requestedAt:
        typeof msg.payload.requestedAt === 'number'
          ? msg.payload.requestedAt
          : Date.now(),
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
    msg: WakuMessage<{ address: string }>,
  ): Promise<'admin.registered'> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    if (msg.type && msg.type !== 'admin.approve') {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid approval type', 'admin-agent');
    }
    if (this.hasSeenSignature(msg.signature)) {
      return 'admin.registered';
    }
    this.rememberSignature(msg.signature);
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
}

export default new AdminAgent();
