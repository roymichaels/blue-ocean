import type { LightNode } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { errorLog } from '@/utils/logger';
import config from '@/config';
import { canonicalJson } from '@/utils/serialization';

const isProd = process.env.NODE_ENV === 'production';
const strict = (config.WAKU_STRICT || (isProd ? '1' : '0')) === '1';
const disabled =
  config.WAKU_DISABLE === '1' ||
  config.EXPO_PUBLIC_WAKU_DISABLE === '1';

export function isWakuDisabled(): boolean {
  return disabled;
}

const PUB =
  config.WAKU_PUBLISHER_KEY ||
  config.EXPO_PUBLIC_WAKU_PUBLISHER_KEY ||
  '';
const BOOT = (
  config.WAKU_BOOTSTRAP ||
  config.EXPO_PUBLIC_WAKU_BOOTSTRAP ||
  ''
) 
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_BOOTSTRAPS: string[] = [
  // use your repo’s existing defaults; if none, keep array empty
];

let cachedNode: LightNode | null = null;
const receivedIds = new Set<string>();

function getPublisherKey(): string {
  if (PUB) return PUB;
  if (strict) throw new Error('WAKU_PUBLISHER_KEY required in strict/prod.');
  try {
    const k =
      typeof window !== 'undefined'
        ? localStorage.getItem('waku_ephemeral_key') ||
          (localStorage.setItem(
            'waku_ephemeral_key',
            'hex:' +
              Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('')
          ),
          localStorage.getItem('waku_ephemeral_key')!)
        : 'hex:' + require('crypto').randomBytes(32).toString('hex');
    return k;
  } catch {
    return 'hex:' + '0'.repeat(64);
  }
}

function getBootstraps(): string[] {
  if (disabled) return [];
  if (
    BOOT.length === 0 ||
    (BOOT.length === 1 && ['auto', 'default'].includes(BOOT[0].toLowerCase()))
  ) {
    return DEFAULT_BOOTSTRAPS;
  }
  return BOOT;
}

export async function ensureNode(): Promise<LightNode | null> {
  if (disabled) return null;
  if (cachedNode) return cachedNode;
  const bootstrap = getBootstraps();
  const end = serviceLatency.startTimer({ service: 'waku.ensureNode' });
  try {
    const startNode = async () => {
      if (strict && bootstrap.length === 0) {
        const err: any = new Error('WAKU_BOOTSTRAP_UNCONFIGURED');
        err.code = 'WAKU_BOOTSTRAP_UNCONFIGURED';
        err.source = 'notifications-agent';
        throw err;
      }
      getPublisherKey();
      const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
      const node = await createLightNode({ libp2p: { bootstrap } } as any);
      if (!node) return null;
      await node.start();
      await waitForRemotePeer(node, [Protocols.Relay]);
      return node;
    };
    cachedNode = await retryWithBackoff(startNode);
    logger.info({ service: 'waku.ensureNode' }, 'Waku node started');
    return cachedNode;
  } catch (err) {
    serviceFailures.inc({ service: 'waku.ensureNode' });
    errorLog('Failed to start Waku node', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      errorLog(err.stack);
    }
    logger.error({ err }, 'Failed to start Waku node');
    cachedNode = null;
    return null;
  } finally {
    end();
  }
}

async function sendAck(topic: string, id: string): Promise<void> {
  const node = await ensureNode();
  if (!node) return;
  const client = await getClient();
  const encoder = client.createEncoder({ contentTopic: `${topic}/ack` });
  await node.lightPush.send(encoder, {
    payload: client.utf8ToBytes(canonicalJson({ id })),
  });

}

export async function publish(topic: string, message: any): Promise<string> {
  const node = await ensureNode();
  if (!node) throw new Error('Waku disabled');
  const client = await getClient();
  const id = message?.id || Date.now().toString();
  const encoder = client.createEncoder({ contentTopic: topic });
  await node.lightPush.send(encoder, {
    payload: client.utf8ToBytes(canonicalJson({ ...message, id })),
  });
  return id;

}

export async function subscribeWithAck(
  topic: string,
  cb: (msg: any) => void,
): Promise<() => void> {
  const node = await ensureNode();
  if (!node) return () => {};
  const client = await getClient();
  const decoder = client.createDecoder(topic);
  const handler = async (wakuMsg: any) => {
    if (!wakuMsg.payload) return;
    try {
      const msg = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
      if (msg.id && receivedIds.has(msg.id)) return;
      if (msg.id) receivedIds.add(msg.id);
      cb(msg);
      if (msg.id) await sendAck(topic, msg.id);
    } catch {
      /* ignore */
    }
  };
  const maybeUnsub = (node.relay as any).addObserver(handler, [decoder]) as
    | (() => void)
    | void;
  return () => {
    if (typeof maybeUnsub === 'function') {
      maybeUnsub();
    } else {
      (node.relay as any)?.deleteObserver?.(handler);
    }
  };
}
