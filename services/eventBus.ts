import { errorLog } from '@/utils/logger';
import type { LightNode } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import { uuid } from '../utils/uuid';
import { sha256 } from '@noble/hashes/sha256';
import { chainAdapter } from '@/services/chain';

const STABLE_BOOTSTRAP = [
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP',
  '/dns4/node-01.do-ams3.wakuv2.prod.status.im/tcp/443/wss/p2p/16Uiu2HAm67ShxB2S7RMyCV2wAPYp4nX3UX77DpDhmPEwAE8XEq8y',
  '/dns4/node-01.gc-us-central1-a.wakuv2.prod.status.im/tcp/443/wss/p2p/16Uiu2HAkwpZJYG1ChB7FAuoCd8ohgfqNynFUsBpt7NrodpAt4E7X',
];
const ANALYTICS_TOPIC = '/blue-ocean/analytics/1';
const sessionId = uuid();

let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    if ((process.env.EXPO_PUBLIC_TRANSPORT || '').toLowerCase() !== 'waku') {
      // In HTTP mode, disable Waku analytics
      return null;
    }
    let bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) bootstrap = STABLE_BOOTSTRAP;
    if (bootstrap.length === 0) return null;
    const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
    node = await createLightNode({ libp2p: { bootstrap } } as any);
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
      payload: client.utf8ToBytes(JSON.stringify(event)),
    });
  } catch (err) {
    errorLog('Failed to publish event', err);
  }
}

export async function track(
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await publish(ANALYTICS_TOPIC, type, payload);
}

export default { publish, track };

