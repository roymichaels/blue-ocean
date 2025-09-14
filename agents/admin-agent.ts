import { EventEmitter } from 'events';
import { getValue, setValue } from '@/services/nearKvStore';
import { canonicalJson } from '@/utils/serialization';
import { verifyMessageSignature } from '@/utils/verifyMessageSignature';
import AgentError from '@/types/AgentError';
import type { WakuMessage } from '@/types/waku';
import {
  adminCountGauge,
  adminUnauthorizedAttempts,
} from '@/services/monitoring';

interface AdminRecord {
  address: string;
  publicKey: string;
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
  | { type: 'admin.requested'; payload: { address: string } };

export class AdminAgent extends EventEmitter {
  async getAdmins(): Promise<AdminRecord[]> {
    return await readRecords(ADMINS_KEY);
  }

  async getPendingRequests(): Promise<AdminRecord[]> {
    return await readRecords(PENDING_KEY);
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
    msg: WakuMessage<{ address: string }>,
  ): Promise<AdminAgentEvent['type']> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    const record: AdminRecord = {
      address: msg.payload.address,
      publicKey: msg.sender.publicKey,
    };
    const admins = await this.getAdmins();
    if (admins.length === 0) {
      await this.addAdmin(record);
      this.emit('admin.registered', { address: record.address });
      return 'admin.registered';
    }
    // already admin? return registered event without queue
    if (admins.some((a) => a.address === record.address)) {
      this.emit('admin.registered', { address: record.address });
      return 'admin.registered';
    }
    // otherwise queue
    const pending = await this.getPendingRequests();
    if (!pending.some((p) => p.address === record.address)) {
      await this.queueRequest(record);
    }
    this.emit('admin.requested', { address: record.address });
    return 'admin.requested';
  }

  async approveAdmin(
    msg: WakuMessage<{ address: string }>,
  ): Promise<'admin.registered'> {
    const valid = await verifyMessageSignature(msg, msg.sender.publicKey);
    if (!valid) {
      throw new AgentError('E_SIGNATURE_INVALID', 'Invalid signature', 'admin-agent');
    }
    const admins = await this.getAdmins();
    const isAdmin = admins.some((a) => a.publicKey === msg.sender.publicKey);
    if (!isAdmin) {
      adminUnauthorizedAttempts.inc();
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
