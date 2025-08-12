import { getValue, setValue, listValues } from './tonKvStore';
import config from '../utils/appConfig';
import {
  LightNode,
  Protocols,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  utf8ToBytes,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';

const ADDRESS =
  config.TON_SETTINGS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export interface TonSettings {
  tenantId: string;
  appName: string;
  theme: { primary: string };
  brand: { logoCid: string };
  fiatKey?: string;
  feeAddress?: string;
  feeBps?: number;
  admins: string[];
}

export async function getSetting(key: string): Promise<string | null> {
  return await getValue(ADDRESS, key);
}

export interface SettingsWriteEvent {
  type: 'settings.write';
  key: string;
  value: string;
  actor: string;
  timestamp: number;
}

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

async function emit(event: SettingsWriteEvent) {
  const n = await ensureNode();
  if (!n) return;
  try {
    const encoder = createEncoder({ contentTopic: '/congress/settings/1' });
    await n.lightPush.send(encoder, {
      payload: utf8ToBytes(JSON.stringify(event)),
    });
  } catch (err) {
    console.error('Failed to broadcast settings.write', err);
  }
}

export async function setSetting(
  key: string,
  value: string,
  actor: string,
) {
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
  let feeBps = 0;
  if (map['feeBps'] !== undefined) {
    const parsed = Number(map['feeBps']);
    if (Number.isNaN(parsed)) {
      console.warn(
        `Invalid feeBps value "${map['feeBps']}"; defaulting to 0`,
      );
    } else {
      feeBps = parsed;
    }
  }
  return {
    tenantId: map['tenantId'] ?? 'thecongress',
    appName: map['appName'] ?? 'Blue Ocean',
    theme: { primary: map['theme.primary'] ?? '#B99C5A' },
    brand: { logoCid: map['brand.logoCid'] ?? '' },
    fiatKey: map['fiatKey'],
    feeAddress: map['feeAddress'] ?? '',
    feeBps,
    admins: map['admins'] ? JSON.parse(map['admins']) : [],
  };
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
