import nearAuth from '@/features/auth/services/nearAuth';
import { assertNearChain } from '../services/chain';
import {
  getSetting,
  setSetting,
  getAdmins as fetchAdmins,
  setAdmins as storeAdmins,
  subscribeToSettingsWrites,
} from '../services/nearSettings';
import ensureTonWallet from '../utils/ensureTonWallet';

assertNearChain();

type SettingKey =
  | 'tenantId'
  | 'appName'
  | 'theme.primary'
  | 'brand.logoCid'
  | 'fiatKey'
  | 'feeAddress'
  | 'feeBps'
  | 'paymentFactoryAddress'
  | 'rpcUrl'
  | 'rpcFallbackUrls'
  | 'paymentFactoryAddress';

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
    await ensureTonWallet('Please connect your NEAR wallet to manage settings.');
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureWallet();
    const actor = nearAuth.getAccountId()!;
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
    const actor = nearAuth.getAccountId()!;
    await storeAdmins(admins, actor);
    this.admins = admins;
    this.adminsFetchedAt = Date.now();
  }

  async getRpcUrls(): Promise<{ rpcUrl: string; rpcFallbackUrls: string[] }> {
    const rpcUrl = (await this.get('rpcUrl')) || '';
    const fallbacksRaw = await this.get('rpcFallbackUrls');
    let rpcFallbackUrls: string[] = [];
    if (fallbacksRaw) {
      try {
        rpcFallbackUrls = JSON.parse(fallbacksRaw);
      } catch {
        rpcFallbackUrls = [];
      }
    }
    return { rpcUrl, rpcFallbackUrls };
  }

  async setRpcUrls(rpcUrl: string, rpcFallbackUrls: string[]): Promise<void> {
    await this.set('rpcUrl', rpcUrl);
    await this.set('rpcFallbackUrls', JSON.stringify(rpcFallbackUrls));
  }

  async getPaymentFactoryAddress(): Promise<string | null> {
    return await this.get('paymentFactoryAddress');
  }

  async setPaymentFactoryAddress(address: string): Promise<void> {
    await this.set('paymentFactoryAddress', address);
  }

  static getInstance(): SettingsAgent {
    if (!this.instance) {
      this.instance = new SettingsAgent();
    }
    return this.instance;
  }
}

export default SettingsAgent;
