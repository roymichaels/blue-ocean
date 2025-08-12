import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  Protocols,
  utf8ToBytes,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';

let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    const bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) return null;
    node = await createLightNode({ libp2p: { bootstrap } });
    await node.start();
    await waitForRemotePeer(node, [Protocols.Relay]);
    return node;
  } catch (err) {
    console.error('Failed to start Waku node', err);
    node = null;
    return null;
  }
}

export async function publish(contentTopic: string, payload: unknown): Promise<void> {
  const n = await ensureNode();
  if (!n) return;
  try {
    const encoder = createEncoder({ contentTopic });
    await n.lightPush.send(encoder, {
      payload: utf8ToBytes(JSON.stringify(payload)),
    });
  } catch (err) {
    console.error('Failed to publish event', err);
  }
}

export default { publish };

