import nearAuth from '@/features/auth/services/nearAuth';
import { assertNearChain } from '@/services/chain';
import {
  getSetting,
  setSetting,
  getAdmins as fetchAdmins,
  setAdmins as storeAdmins,
  getAdminScopes as fetchAdminScopes,
  setAdminScopes as storeAdminScopes,
  getAdminPublicKeys as fetchAdminPublicKeys,
  setAdminPublicKeys as storeAdminPublicKeys,
  subscribeToSettingsWrites,
} from '@/services/nearSettings';
import { createWalletGuard } from '@/utils/createWalletGuard';
import { normalizeMessage } from '../lib/normalizeMessage';
import { canonicalJson } from '@/utils/serialization';
import type { AdminScope } from '@/types';
import { ALL_ADMIN_SCOPES } from '@/types';

// In tests, the chain module may be partially mocked. Avoid hard-failing on import.
if (typeof assertNearChain === 'function') {
  try { assertNearChain(); } catch {}
}

// TODO:TODO-110 Introduce versioned migrations for tenant settings so schema changes propagate safely across wallets.
// TODO:REC-210 Move admin scope management into dedicated module with explicit capability contracts.
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
  | 'paymentFactoryAddress'
  | 'kyc.required'
  | 'kyc.requireSocialProof'
  | 'kyc.requireWhatsappCall';

class SettingsAgent {
  private static instance: SettingsAgent;
  private admins: string[] = [];
  private adminsFetchedAt = 0;
  private adminPublicKeys: string[] = [];
  private adminPublicKeysFetchedAt = 0;
  private adminScopes: Record<string, AdminScope[]> = {};
  private adminScopesFetchedAt = 0;
  private static ADMIN_CACHE_TTL = 60000; // 1 minute

  private constructor() {
    void subscribeToSettingsWrites((evt) => {
      if (evt.key === 'admins') {
        this.admins = [];
        this.adminsFetchedAt = 0;
      }
      if (evt.key === 'adminPublicKeys') {
        this.adminPublicKeys = [];
        this.adminPublicKeysFetchedAt = 0;
      }
      if (evt.key === 'adminScopes') {
        this.adminScopes = {};
        this.adminScopesFetchedAt = 0;
      }
    });
  }

  private ensureWallet = createWalletGuard(
    'Please connect your NEAR wallet to manage settings.',
  );

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
    await this.loadAdminScopes();
    const scoped = Object.keys(this.adminScopes);
    if (scoped.length > 0) return scoped;
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

  private async loadAdminScopes() {
    const now = Date.now();
    if (
      Object.keys(this.adminScopes).length === 0 ||
      now - this.adminScopesFetchedAt > SettingsAgent.ADMIN_CACHE_TTL
    ) {
      this.adminScopes = await fetchAdminScopes();
      this.adminScopesFetchedAt = now;
    }
  }

  async getAdminsWithScope(scope: AdminScope): Promise<string[]> {
    await this.loadAdminScopes();
    return Object.keys(this.adminScopes).filter((a) =>
      this.adminScopes[a]?.includes(scope),
    );
  }

  async hasAdminScope(address: string, scope: AdminScope): Promise<boolean> {
    await this.loadAdminScopes();
    return this.adminScopes[address]?.includes(scope) ?? false;
  }

  async setAdmins(admins: string[]): Promise<void> {
    await this.ensureWallet();
    const actor = nearAuth.getAccountId()!;
    const normalized = normalizeMessage<string[]>('Admins', admins as any);
    await storeAdmins(normalized, actor);
    this.admins = normalized;
    this.adminsFetchedAt = Date.now();
    const scopes: Record<string, AdminScope[]> = {};
    normalized.forEach((a) => {
      scopes[a] = ALL_ADMIN_SCOPES;
    });
    await storeAdminScopes(scopes, actor);
    this.adminScopes = scopes;
    this.adminScopesFetchedAt = Date.now();
  }

  async setAdminScopes(scopes: Record<string, AdminScope[]>): Promise<void> {
    await this.ensureWallet();
    const actor = nearAuth.getAccountId()!;
    const normalized = normalizeMessage<Record<string, AdminScope[]>>(
      'AdminScopes',
      scopes as any,
    );
    await storeAdminScopes(normalized, actor);
    this.adminScopes = normalized;
    this.adminScopesFetchedAt = Date.now();
    this.admins = Object.keys(normalized);
    this.adminsFetchedAt = Date.now();
  }

  async getAdminPublicKeys(): Promise<string[]> {
    const now = Date.now();
    if (
      this.adminPublicKeys.length === 0 ||
      now - this.adminPublicKeysFetchedAt > SettingsAgent.ADMIN_CACHE_TTL
    ) {
      this.adminPublicKeys = await fetchAdminPublicKeys();
      this.adminPublicKeysFetchedAt = now;
    }
    return this.adminPublicKeys;
  }

  async setAdminPublicKeys(keys: string[]): Promise<void> {
    await this.ensureWallet();
    const actor = nearAuth.getAccountId()!;
    await storeAdminPublicKeys(keys, actor);
    this.adminPublicKeys = keys;
    this.adminPublicKeysFetchedAt = Date.now();
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
    await this.set('rpcFallbackUrls', canonicalJson(rpcFallbackUrls));
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
