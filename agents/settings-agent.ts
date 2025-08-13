import tonAuth from '../services/tonAuth';
import {
  getSetting,
  setSetting,
  getAdmins as fetchAdmins,
  setAdmins as storeAdmins,
  subscribeToSettingsWrites,
} from '../services/tonSettings';
import ensureTonWallet from '../utils/ensureTonWallet';

type SettingKey =
  | 'tenantId'
  | 'appName'
  | 'theme.primary'
  | 'brand.logoCid'
  | 'fiatKey'
  | 'feeAddress'
  | 'feeBps';

class SettingsAgent {
  private static instance: SettingsAgent;
  private admins: string[] = [];
  private adminsFetchedAt = 0;
  private static ADMIN_CACHE_TTL = 60_000; // 1 minute

  private constructor() {
    void subscribeToSettingsWrites((evt) => {
      if (evt.key === 'admins') {
        this.admins = [];
        this.adminsFetchedAt = 0;
      }
    });
  }

  private async ensureWallet() {
    await ensureTonWallet('Please connect your TON wallet to manage settings.');
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureWallet();
    const actor = tonAuth.getAddress()!;
    await setSetting(key, value, actor);
  }

  async get(key: string): Promise<string | null> {
    return await getSetting(key);
  }

  async getSettingValue(key: SettingKey): Promise<string | null> {
    return await getSetting(key);
  }

  async updateSettingValue(key: SettingKey, value: string): Promise<void> {
    await this.set(key, value);
  }

  async getAdmins(): Promise<string[]> {
    const now = Date.now();
    if (
      this.admins.length === 0 ||
      now - this.adminsFetchedAt > SettingsAgent.ADMIN_CACHE_TTL
    ) {
      this.admins = await fetchAdmins();
      this.adminsFetchedAt = now;
    }
    return this.admins;
  }

  async setAdmins(admins: string[]): Promise<void> {
    await this.ensureWallet();
    const actor = tonAuth.getAddress()!;
    await storeAdmins(admins, actor);
    this.admins = admins;
    this.adminsFetchedAt = Date.now();
  }

  static getInstance(): SettingsAgent {
    if (!this.instance) {
      this.instance = new SettingsAgent();
    }
    return this.instance;
  }
}

export default SettingsAgent;
