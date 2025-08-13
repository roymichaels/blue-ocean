import { debugLog, errorLog } from '@/utils/logger';
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  Protocols,
  utf8ToBytes,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import { randomUUID, createHash } from 'crypto';
import tonAuth from './tonAuth';

const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';
const ANALYTICS_TOPIC = '/congress/analytics/1';
const sessionId = randomUUID();

let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    const bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) {
      debugLog(
        'No Waku bootstrap nodes configured. Using default bootstrap. Set EXPO_PUBLIC_WAKU_BOOTSTRAP to customize.',
      );
      bootstrap.push(DEFAULT_BOOTSTRAP);
    }
    node = await createLightNode({ libp2p: { bootstrap } });
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
  payload: Record<string, any> = {},
): Promise<void> {
  const n = await ensureNode();
  if (!n) return;
  try {
    const encoder = createEncoder({ contentTopic });
    const addr = tonAuth.getAddress();
    const event = {
      id: randomUUID(),
      timestamp: Date.now(),
      actor: addr ? createHash('sha256').update(addr).digest('hex') : undefined,
      sessionId,
      type,
      ...payload,
    };
    await n.lightPush.send(encoder, {
      payload: utf8ToBytes(JSON.stringify(event)),
    });
  } catch (err) {
    errorLog('Failed to publish event', err);
  }
}

export async function track(
  type: string,
  payload: Record<string, any> = {},
): Promise<void> {
  await publish(ANALYTICS_TOPIC, type, payload);
}

export default { publish, track };

