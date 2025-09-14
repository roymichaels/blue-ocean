import { errorLog } from '@/utils/logger';
import { withMonitoring } from './monitoring';
import type { LightNode } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { uuid } from '../utils/uuid';
import { sha256 } from '@noble/hashes/sha256';
import { chainAdapter } from '@/services/chain';
import config from '@/config';
import { canonicalJson } from '@/utils/serialization';

const ANALYTICS_TOPIC = '/blue-ocean/analytics/1';
const sessionId = uuid();

let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    if ((config.EXPO_PUBLIC_TRANSPORT || '').toLowerCase() !== 'waku') {
      // In HTTP mode, disable Waku analytics
      return null;
    }
    const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
    node = await createLightNode({} as any);
    if (!node) return null;
    await node.start();
    await waitForRemotePeer(node, [Protocols.Relay]);
    return node;
  } catch (err) {
    errorLog('Failed to start Waku node', err);
    node = null;
    return null;
  }
}

export async function publish(
  contentTopic: string,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await withMonitoring('eventBus.publish', async () => {
    const n = await ensureNode();
    if (!n) return;
    try {
      const client = await getClient();
      const encoder = client.createEncoder({ contentTopic });
      const addr = chainAdapter.getAccountId();
      const event = {
        id: uuid(),
        timestamp: Date.now(),
        actor: addr ? Buffer.from(sha256(Buffer.from(addr))).toString('hex') : undefined,
        sessionId,
        type,
        ...payload,
      };
      await n.lightPush.send(encoder, {
        payload: client.utf8ToBytes(canonicalJson(event)),
      });
    } catch (err) {
      errorLog('Failed to publish event', err);
    }
  });
}

export async function track(
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await publish(ANALYTICS_TOPIC, type, payload);
}

export default { publish, track };

