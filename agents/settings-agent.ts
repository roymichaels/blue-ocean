import WakuAgent from '../utils/wakuAgent';
import { sendWakuSettingsUpdate } from '../lib/waku/sendWakuSettingsUpdate';
import { store } from '../lib/memoryStore';
import type { TenantSettings } from '../types';

interface SettingItem { id: string; value: string }

class SettingsAgent extends WakuAgent<SettingItem> {
  private static instance: SettingsAgent;

  private constructor() {
    super(
      async ({ id, value }) => {
        const now = Date.now();
        await sendWakuSettingsUpdate(id, value, now, now);
      },
      {
        topic: '/congress/settings/1/proto',
        replayHistory: true,
        extractItem: (msg: any) =>
          msg.type === 'settings.update'
            ? { id: msg.key as string, value: msg.value as string }
            : undefined,
      }
    );
  }

  async set(key: string, value: string): Promise<void> {
    if (this.store.has(key)) {
      await this.update({ id: key, value });
    } else {
      await this.add({ id: key, value });
    }
  }

  protected async broadcast(item: SettingItem) {
    try {
      await sendWakuSettingsUpdate(item.id, item.value, Date.now(), Date.now());
    } catch (e) {
      console.error('Failed to broadcast settings update', e);
    }
  }

  async getTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color'
  ): Promise<string | null> {
    const obj = store.tenantSettings[tenant];
    if (!obj) return null;
    return (obj as any)[key] ?? null;
  }

  async updateTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
    value: string
  ): Promise<void> {
    if (!store.tenantSettings[tenant]) {
      store.tenantSettings[tenant] = { tenant_id: tenant } as TenantSettings;
    }
    (store.tenantSettings[tenant] as any)[key] = value;
    await this.set(key, value);
  }

  static getInstance(): SettingsAgent {
    if (!this.instance) {
      this.instance = new SettingsAgent();
    }
    return this.instance;
  }
}

export default SettingsAgent;
