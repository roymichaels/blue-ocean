import {
  createLightNode,
  waitForRemotePeer,
  Protocols,
  type LightNode,
  type Decoder,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../../utils/appConfig';

let nodePromise: Promise<LightNode> | null = null;

type TopicSubscription = {
  decoder: Decoder<any>;
  handlers: Set<(msg: any) => void | Promise<void>>;
  callback: (msg: any) => void | Promise<void>;
};

const subscriptions: Map<string, TopicSubscription> = new Map();

export async function getNode(): Promise<LightNode> {
  if (!nodePromise) {
    nodePromise = (async () => {
      const bootstrap = getWakuBootstrapNodes();
      const n = await createLightNode({
        ...(bootstrap.length === 0 ? { defaultBootstrap: true } : {}),
        libp2p: {
          hideWebSocketInfo: true,
          ...(bootstrap.length ? { bootstrap } : {}),
        },
      });
      await n.start();
      await waitForRemotePeer(n, [
        Protocols.Filter,
        Protocols.Store,
        Protocols.LightPush,
      ]);
      return n;
    })();
  }
  return nodePromise;
}

export async function subscribe(
  topic: string,
  handler: (msg: any) => void | Promise<void>,
): Promise<Decoder<any>> {
  const node = await getNode();
  let sub = subscriptions.get(topic);
  if (!sub) {
    const decoder = node.createDecoder({ contentTopic: topic });
    const handlers = new Set<(msg: any) => void | Promise<void>>();
    const callback = async (msg: any) => {
      for (const h of handlers) {
        await h(msg);
      }
    };
    await node.filter!.subscribe(decoder, callback);
    sub = { decoder, handlers, callback };
    subscriptions.set(topic, sub);
  }
  sub.handlers.add(handler);
  return sub.decoder;
}

export async function unsubscribe(
  topic: string,
  handler: (msg: any) => void | Promise<void>,
): Promise<void> {
  const sub = subscriptions.get(topic);
  if (!sub) return;
  sub.handlers.delete(handler);
  if (sub.handlers.size === 0) {
    const node = await getNode();
    try {
      await node.filter?.unsubscribe(sub.decoder);
    } catch {
      // ignore unsubscribe errors
    }
    subscriptions.delete(topic);
  }
}

export async function stopNode(): Promise<void> {
  if (nodePromise) {
    const n = await nodePromise;
    for (const { decoder } of subscriptions.values()) {
      try {
        await n.filter?.unsubscribe(decoder);
      } catch {}
    }
    subscriptions.clear();
    await n.stop();
    nodePromise = null;
  }
}
