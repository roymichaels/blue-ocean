import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import adminAgent, { AdminAgentEvent } from '@/agents/admin-agent';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import { publish } from '@/services/waku';

const USERS_TOPIC = '/blue-ocean/users/1';

export interface PendingAdminRequest {
  address: string;
  publicKey: string;
  requestedAt: number;
}

function randomNonce(byteLength = 12): string {
  return Buffer.from(randomBytes(byteLength)).toString('hex');
}

export async function listPendingAdminRequests(): Promise<PendingAdminRequest[]> {
  const pending = await adminAgent.getPendingRequests();
  return pending.map((request) => ({
    address: request.address,
    publicKey: request.publicKey,
    requestedAt: request.requestedAt || Date.now(),
  }));
}

export async function requestAdminAccess(address: string): Promise<AdminAgentEvent['type']> {
  const message = await makeSignedWakuMessage(
    'admin.joinRequested',
    {
      address,
      nonce: randomNonce(),
      ts: Date.now(),
    },
    'admin',
  );
  const result = await adminAgent.requestAdmin(message);
  try {
    await publish(USERS_TOPIC, message);
  } catch {
    /* publishing is best-effort */
  }
  return result;
}

export async function approveAdminRequest(address: string): Promise<AdminAgentEvent['type']> {
  const message = await makeSignedWakuMessage(
    'admin.approve',
    {
      address,
      nonce: randomNonce(),
      ts: Date.now(),
    },
    'admin',
  );
  const result = await adminAgent.approveAdmin(message);
  try {
    await publish(USERS_TOPIC, message);
  } catch {
    /* ignore transport errors */
  }
  return result;
}

export async function rejectAdminRequest(address: string): Promise<AdminAgentEvent['type']> {
  const message = await makeSignedWakuMessage(
    'admin.reject',
    {
      address,
      nonce: randomNonce(),
      ts: Date.now(),
    },
    'admin',
  );
  const result = await adminAgent.rejectAdmin(message);
  try {
    await publish(USERS_TOPIC, message);
  } catch {
    /* ignore transport errors */
  }
  return result;
}

export default {
  listPendingAdminRequests,
  requestAdminAccess,
  approveAdminRequest,
  rejectAdminRequest,
};
