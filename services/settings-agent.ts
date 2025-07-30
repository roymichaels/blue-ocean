import { store } from '../lib/memoryStore';
import { sendWakuSettingsUpdate } from '../lib/waku/sendWakuSettingsUpdate';
import { decryptWakuPayload } from '../lib/waku/wakuCrypto';
import config from '../utils/appConfig';

import type { TenantSettings } from '../types';

class SettingsAgent {
  private static instance: SettingsAgent;
  private node: any | null = null;
  private decoder: any | null = null;
  private ready: Promise<void> | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): SettingsAgent {
    if (!SettingsAgent.instance) {
      SettingsAgent.instance = new SettingsAgent();
    }
    return SettingsAgent.instance;
  }

  private async init() {
    const enabled = config.EXPO_PUBLIC_USE_WAKU || 'false';
    if (enabled !== 'true') return;
    const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
    const { verify, etc: edBytes } = await import('@noble/ed25519');
    const { sha256 } = await import('@noble/hashes/sha256');

    this.node = await createLightNode({ defaultBootstrap: true });
    await this.node.start();
    await waitForRemotePeer(this.node, [Protocols.Store, Protocols.LightPush]);

    const topic = '/congress/settings/1/proto';
    this.decoder = this.node.createDecoder({ contentTopic: topic });
    await this.node.filter!.subscribe(this.decoder, async (msg: any) => {
      if (!msg.payload) return;
      const decoded = new TextDecoder().decode(msg.payload);
      const plaintext = await decryptWakuPayload(decoded);
      try {
        const parsed = JSON.parse(plaintext);
        if (!parsed.signature || !parsed.sender?.publicKey) {
          return;
        }
        const verifyObj = {
          type: parsed.type,
          key: parsed.key,
          value: parsed.value,
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
          sender: {
            id: parsed.sender.id,
            publicKey: parsed.sender.publicKey,
            role: parsed.sender.role,
          },
        };
        const hash = sha256(new TextEncoder().encode(JSON.stringify(verifyObj)));
        const ok = await verify(
          edBytes.hexToBytes(parsed.signature),
          hash,
          edBytes.hexToBytes(parsed.sender.publicKey),
        );
        if (!ok || parsed.sender.role !== 'admin') {
          return;
        }
        if (parsed.type === 'settings.update') {
          const tenant = parsed.sender.id || 'default';
          if (!store.tenantSettings[tenant]) {
            store.tenantSettings[tenant] = { tenant_id: tenant } as TenantSettings;
          }
          (store.tenantSettings[tenant] as any)[parsed.key] = parsed.value;
        }
      } catch (e) {
        console.error('Invalid Waku message:', e);
      }
    });
  }

  async getTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
  ): Promise<string | null> {
    const obj = store.tenantSettings[tenant];
    if (!obj) return null;
    return (obj as any)[key] ?? null;
  }

  async updateTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
    value: string,
  ): Promise<void> {
    if (!store.tenantSettings[tenant]) {
      store.tenantSettings[tenant] = { tenant_id: tenant } as TenantSettings;
    }
    (store.tenantSettings[tenant] as any)[key] = value;
    await sendWakuSettingsUpdate(key, value, Date.now(), Date.now());
  }
}

export default SettingsAgent;
