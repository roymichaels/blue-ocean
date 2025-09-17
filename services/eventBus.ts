import { errorLog, debugLog } from '@/utils/logger';
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

interface PublishOptions {
  orderId?: string;
  orderNonce?: string;
  stage?: string;
}

// TODO:TODO-102 Harden ensureNode to survive mobile background transitions without leaking dangling Waku nodes.
// TODO:REC-202 Emit structured connectivity metrics from ensureNode so monitoring can alert on relay unavailability.
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
  options: PublishOptions = {},
): Promise<void> {
  const stageLabel = options.stage ?? type;
  const metricsLabels: Record<string, string> = { stage: stageLabel };
  if (options.orderId) {
    metricsLabels.order_id = options.orderId;
  }
  if (options.orderNonce) {
    metricsLabels.order_nonce = options.orderNonce;
  }
  await withMonitoring(
    'eventBus.publish',
    async () => {
      const n = await ensureNode();
      if (!n) return;
      try {
        const client = await getClient();
        const encoder = client.createEncoder({ contentTopic } as any);
        const addr = chainAdapter.getAccountId();
        const event = {
          id: uuid(),
          timestamp: Date.now(),
          actor: addr ? Buffer.from(sha256(Buffer.from(addr))).toString('hex') : undefined,
          sessionId,
          type,
          ...payload,
        };
        if (options.orderId || options.orderNonce) {
          debugLog('eventBus.publish', {
            contentTopic,
            type,
            stage: stageLabel,
            orderId: options.orderId,
            orderNonce: options.orderNonce,
          });
        }
        await n.lightPush.send(encoder, {
          payload: client.utf8ToBytes(canonicalJson(event)),
        });
      } catch (err) {
        errorLog('Failed to publish event', {
          contentTopic,
          type,
          stage: stageLabel,
          orderId: options.orderId,
          orderNonce: options.orderNonce,
          errorMessage: err instanceof Error ? err.message : err,
          errorStack: err instanceof Error ? err.stack : undefined,
        });
      }
    },
    metricsLabels,
  );
}

export async function track(
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await publish(ANALYTICS_TOPIC, type, payload, { stage: 'analytics' });
}

export default { publish, track };

