import adminAgent from '@/agents/admin-agent';
import { subscribeWithAck } from '@/services/waku';
import { errorLog } from '@/utils/logger';
import type { WakuMessage } from '@/types/waku';

const USERS_TOPIC = '/blue-ocean/users/1';

let subscriptionPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

function toWakuMessage(raw: any): WakuMessage<any> | null {
  if (!raw || typeof raw !== 'object') return null;
  const { type, payload, sender, signature } = raw as Record<string, unknown>;
  if (typeof type !== 'string' || !type.startsWith('admin.')) return null;
  if (!payload || typeof payload !== 'object') return null;
  if (!sender || typeof sender !== 'object') return null;
  return {
    type,
    payload,
    sender: sender as WakuMessage<any>['sender'],
    signature: typeof signature === 'string' ? signature : '',
  };
}

export async function ensureAdminAgentSubscription(): Promise<void> {
  if (subscriptionPromise) {
    await subscriptionPromise;
    return;
  }
  subscriptionPromise = (async () => {
    unsubscribe = await subscribeWithAck(USERS_TOPIC, (raw: unknown) => {
      const message = toWakuMessage(raw);
      if (!message) return;
      void adminAgent.handleMessage(message).catch((err) => {
        errorLog('admin-agent.handleMessage failed', err);
      });
    });
  })().catch((err) => {
    subscriptionPromise = null;
    unsubscribe = null;
    errorLog('Failed to subscribe admin agent', err);
    throw err;
  });
  await subscriptionPromise;
}

export function stopAdminAgentSubscription(): void {
  unsubscribe?.();
  unsubscribe = null;
  subscriptionPromise = null;
}
