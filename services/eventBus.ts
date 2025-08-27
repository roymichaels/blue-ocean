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
import nearAuth from './nearAuth';

const STABLE_BOOTSTRAP = [
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP',
  '/dns4/node-01.do-ams3.wakuv2.prod.status.im/tcp/443/wss/p2p/16Uiu2HAm67ShxB2S7RMyCV2wAPYp4nX3UX77DpDhmPEwAE8XEq8y',
  '/dns4/node-01.gc-us-central1-a.wakuv2.prod.status.im/tcp/443/wss/p2p/16Uiu2HAkwpZJYG1ChB7FAuoCd8ohgfqNynFUsBpt7NrodpAt4E7X',
];
const ANALYTICS_TOPIC = '/blue-ocean/analytics/1';
const sessionId = randomUUID();

let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    let bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) {
      debugLog('Using built-in Waku bootstrap nodes');
      bootstrap = STABLE_BOOTSTRAP;
    } else {
      debugLog('Using custom Waku bootstrap nodes');
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
    const addr = nearAuth.getAccountId();
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

