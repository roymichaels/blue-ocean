import tonAuth from '../services/tonAuth';
import {
  getSetting,
  setSetting,
  getAdmins as fetchAdmins,
  setAdmins as storeAdmins,
} from '../services/tonSettings';

interface SettingItem { id: string; value: string }

class SettingsAgent {
  private static instance: SettingsAgent;
  private admins: string[] = [];

  private constructor() {}

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage settings.');
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureWallet();
    await setSetting(key, value);
  }

  async get(key: string): Promise<string | null> {
    return await getSetting(key);
  }

  async getTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
  ): Promise<string | null> {
    return await getSetting(`${tenant}:${key}`);
  }

  async updateTenantSetting(
    tenant: string,
    key: 'platform_name' | 'platform_logo' | 'theme_color',
    value: string,
  ): Promise<void> {
    await this.set(`${tenant}:${key}`, value);
  }

  async getAdmins(): Promise<string[]> {
    if (this.admins.length === 0) {
      this.admins = await fetchAdmins();
    }
    return this.admins;
  }

  async setAdmins(admins: string[]): Promise<void> {
    await this.ensureWallet();
    await storeAdmins(admins);
    this.admins = admins;
  }

  static getInstance(): SettingsAgent {
    if (!this.instance) {
      this.instance = new SettingsAgent();
    }
    return this.instance;
  }
}

export default SettingsAgent;
