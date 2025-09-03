import { LightNode, createLightNode, waitForRemotePeer, Protocols } from '@waku/sdk';
import { errorLog } from '@/utils/logger';

const isProd = process.env.NODE_ENV === 'production';
const strict = (process.env.WAKU_STRICT ?? (isProd ? '1' : '0')) === '1';
const disabled =
  process.env.WAKU_DISABLE === '1' ||
  process.env.EXPO_PUBLIC_WAKU_DISABLE === '1';

export function isWakuDisabled(): boolean {
  return disabled;
}

const PUB =
  process.env.WAKU_PUBLISHER_KEY ||
  process.env.EXPO_PUBLIC_WAKU_PUBLISHER_KEY ||
  '';
const BOOT = (
  process.env.WAKU_BOOTSTRAP ||
  process.env.EXPO_PUBLIC_WAKU_BOOTSTRAP ||
  ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_BOOTSTRAPS: string[] = [
  // use your repo’s existing defaults; if none, keep array empty
];

let cachedNode: LightNode | null = null;

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
  if (strict && bootstrap.length === 0) {
    const err: any = new Error('WAKU_BOOTSTRAP_UNCONFIGURED');
    err.code = 'WAKU_BOOTSTRAP_UNCONFIGURED';
    err.source = 'notifications-agent';
    throw err;
  }
  getPublisherKey();
  try {
    cachedNode = await createLightNode({ libp2p: { bootstrap } } as any);
    await cachedNode.start();
    await waitForRemotePeer(cachedNode, [Protocols.Relay]);
    return cachedNode;
  } catch (err) {
    errorLog(
      'Failed to start Waku node',
      err instanceof Error ? err.stack : String(err),
    );
    cachedNode = null;
    return null;
  }
}
