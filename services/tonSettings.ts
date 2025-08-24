import { debugLog, errorLog } from '@/utils/logger';
import { getValue, setValue, listValues } from './tonKvStore';
import config from '../utils/appConfig';
import {
  LightNode,
  Protocols,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  createDecoder,
  utf8ToBytes,
  bytesToUtf8,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import type { SettingsWriteEvent, WakuMessage } from '../types/waku';
import { settingsWriteEventSchema, wakuMessageSchema } from '../schemas/waku';
import { verifyBeforeWrite } from '../utils/verifyBeforeWrite';
import { z } from 'zod';
import { sign } from '@noble/ed25519';
import { getPrivateKey, getPublicKeyHex } from './localIdentity';

const ADDRESS =
  config.TON_SETTINGS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';

const TEST_ADMIN = 'EQtestadmin';
const ADMIN_ADDRESS =
  config.ADMIN_WALLET_ADDRESS ||
  process.env.ADMIN_WALLET_ADDRESS ||
  (process.env.NODE_ENV === 'test' ? TEST_ADMIN : '');

function assertAdmin(actor: string): void {
  if (!ADMIN_ADDRESS) return;
  if (actor !== ADMIN_ADDRESS) {
    throw new Error('Admin wallet address required');
  }
}

export interface TonSettings {
  tenantId: string;
  appName: string;
  theme: { primary: string };
  brand: { logoCid: string };
  fiatKey?: string;
  feeAddress?: string;
  feeBps?: number;
  admins: string[];
  rpcUrl: string;
  rpcFallbackUrls?: string[];
  wakuBootstrap?: string[];
}

export async function getSetting(key: string): Promise<string | null> {
  return await getValue(ADDRESS, key);
}

let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    const bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) return null;
    node = await createLightNode({ libp2p: { bootstrap } as any });
    await node.start();
    await waitForRemotePeer(node, [Protocols.Relay]);
    return node;
  } catch (err) {
    errorLog('Failed to start Waku node', err);
    node = null;
    return null;
  }
}

async function emit(event: SettingsWriteEvent) {
  const n = await ensureNode();
  if (!n) return;
  try {
    const priv = await getPrivateKey();
    const pub = await getPublicKeyHex();
    const msg: WakuMessage<SettingsWriteEvent> = {
      type: event.type,
      payload: event,
      sender: { publicKey: pub },
      signature: '',
    };
    const msgBytes = new TextEncoder().encode(
      JSON.stringify({ type: msg.type, payload: msg.payload, sender: msg.sender }),
    );
    const sig = await sign(msgBytes, priv);
    msg.signature = Buffer.from(sig).toString('hex');

    const encoder = createEncoder({ contentTopic: '/blue-ocean/settings/1' });
    await n.lightPush.send(encoder, {
      payload: utf8ToBytes(JSON.stringify(msg)),
    });
  } catch (err) {
    errorLog('Failed to broadcast settings.write', err);
  }
}

export async function subscribeToSettingsWrites(
  cb: (event: SettingsWriteEvent) => void,
): Promise<() => void> {
  const n = await ensureNode();
  if (!n) return () => {};
  const decoder = createDecoder('/blue-ocean/settings/1');
  const handler = async (wakuMsg: any) => {
    if (!wakuMsg.payload) return;
    try {
      const raw = JSON.parse(bytesToUtf8(wakuMsg.payload));
      const schema = wakuMessageSchema.extend({
        type: z.literal('settings.write'),
        payload: settingsWriteEventSchema,
      });
      const signed = await verifyBeforeWrite(raw, schema);
      if (!signed) return;
      cb(signed.payload);
    } catch (err) {
      errorLog('Failed to process settings.write', err);
    }
  };
  const maybeUnsub = (n.relay as any).addObserver(handler, [decoder]) as
    | (() => void)
    | void;
  return () => {
    if (typeof maybeUnsub === 'function') {
      maybeUnsub();
    } else {
      (n.relay as any)?.deleteObserver?.(handler);
    }
  };
}

export async function setSetting(
  key: string,
  value: string,
  actor: string,
) {
  assertAdmin(actor);
  const res = await setValue(ADDRESS, key, value);
  await emit({
    type: 'settings.write',
    key,
    value,
    actor,
    timestamp: Date.now(),
  });
  return res;
}

export async function listSettings(): Promise<{ key: string; value: string }[]> {
  return await listValues(ADDRESS);
}

export async function fetchSettings(): Promise<TonSettings> {
  const entries = await listSettings();
  const map: Record<string, string> = {};
  for (const { key, value } of entries) {
    map[key] = value;
  }
  const envFiat = process.env.EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY;
  if (envFiat) {
    map['fiatKey'] = envFiat;
  }
  let feeBps = 0;
  if (map['feeBps'] !== undefined) {
    const parsed = Number(map['feeBps']);
    if (Number.isNaN(parsed)) {
      debugLog(
        `Invalid feeBps value "${map['feeBps']}"; defaulting to 0`,
      );
    } else {
      feeBps = parsed;
    }
  }
  return {
    tenantId: map['tenantId'] ?? 'blue-ocean',
    appName: map['appName'] ?? 'Blue Ocean',
    theme: { primary: map['theme.primary'] ?? '#B99C5A' },
    brand: { logoCid: map['brand.logoCid'] ?? '' },
    fiatKey: map['fiatKey'],
    feeAddress: map['feeAddress'] ?? '',
    feeBps,
    admins: map['admins'] ? JSON.parse(map['admins']) : [],
    rpcUrl: map['rpcUrl'] ?? '',
    rpcFallbackUrls: map['rpcFallbackUrls']
      ? JSON.parse(map['rpcFallbackUrls'])
      : [],
    wakuBootstrap: map['wakuBootstrap']
      ? JSON.parse(map['wakuBootstrap'])
      : [],
  };
}

export async function getFeeBps(): Promise<number> {
  const raw = await getSetting('feeBps');
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function setFeeBps(value: number, actor: string): Promise<void> {
  await setSetting('feeBps', String(value), actor);
}

export async function getAdmins(): Promise<string[]> {
  const raw = await getSetting('admins');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function setAdmins(admins: string[], actor: string): Promise<void> {
  await setSetting('admins', JSON.stringify(admins), actor);
}
