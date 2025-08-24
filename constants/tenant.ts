import { errorLog } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSettings } from '../services/tonSettings';
import config from '../utils/appConfig';

export let TENANT = 'blue-ocean';

export interface TenantSettings {
  appName: string;
  primaryColor: string;
  logoCid: string;
  fiatKey?: string;
  feeAddress?: string;
  feeBps?: number;
  admins?: string[];
  rpcUrl: string;
  rpcFallbackUrls?: string[];
  wakuBootstrap?: string[];
  paymentFactoryAddress?: string;
}

const initialAdmin =
  (() => {
    const network =
      (config.TON_NETWORK || process.env.TON_NETWORK || 'mainnet').toLowerCase();
    const legacy =
      config.ADMIN_WALLET_ADDRESS || process.env.ADMIN_WALLET_ADDRESS || '';
    const main =
      config.ADMIN_WALLET_ADDRESS_MAINNET ||
      process.env.ADMIN_WALLET_ADDRESS_MAINNET ||
      legacy;
    const test =
      config.ADMIN_WALLET_ADDRESS_TESTNET ||
      process.env.ADMIN_WALLET_ADDRESS_TESTNET ||
      legacy;
    return network === 'testnet' ? test : main;
  })() || '';


export let AppConfig: TenantSettings = {
  appName: 'Blue Ocean',
  primaryColor: '#B99C5A',
  logoCid: '',
  feeAddress: '',
  feeBps: 0,
  admins: initialAdmin ? [initialAdmin] : [],
  rpcUrl: '',
  rpcFallbackUrls: [],
  wakuBootstrap: [],
  paymentFactoryAddress: '',
};

export async function loadTenantSettings(): Promise<void> {
  const TENANT_KEY = 'app_tenant_id';
  const NAME_KEY = 'app_name';
  const COLOR_KEY = 'app_theme_primary';
  const LOGO_KEY = 'app_logo';
  const FIAT_KEY = 'app_fiat_key';
  const FEE_ADDR_KEY = 'app_fee_address';
  const FEE_BPS_KEY = 'app_fee_bps';
  const ADMINS_KEY = 'app_admins';
  const RPC_URL_KEY = 'app_rpc_url';
  const RPC_FALLBACK_KEY = 'app_rpc_fallback_urls';
  const WAKU_BOOTSTRAP_KEY = 'app_waku_bootstrap';
  const PAYMENT_FACTORY_KEY = 'app_payment_factory_address';

  try {
    const [
      t,
      name,
      color,
      logo,
      fiat,
      feeAddr,
      feeBps,
      admins,
      rpc,
      rpcFallback,
      waku,
      paymentFactory,
    ] = await AsyncStorage.multiGet([
      TENANT_KEY,
      NAME_KEY,
      COLOR_KEY,
      LOGO_KEY,
      FIAT_KEY,
      FEE_ADDR_KEY,
      FEE_BPS_KEY,
      ADMINS_KEY,
      RPC_URL_KEY,
      RPC_FALLBACK_KEY,
      WAKU_BOOTSTRAP_KEY,
      PAYMENT_FACTORY_KEY,
    ]);

    if (t?.[1]) TENANT = t[1];
    AppConfig = {
      appName: name?.[1] || AppConfig.appName,
      primaryColor: color?.[1] || AppConfig.primaryColor,
      logoCid: logo?.[1] || AppConfig.logoCid,
      fiatKey: fiat?.[1] || undefined,
      feeAddress: feeAddr?.[1] || '',
      feeBps: feeBps?.[1] ? parseInt(feeBps[1]) : 0,
      admins: admins?.[1] ? JSON.parse(admins[1]) : [],
      rpcUrl: rpc?.[1] || '',
      rpcFallbackUrls: rpcFallback?.[1] ? JSON.parse(rpcFallback[1]) : [],
      wakuBootstrap: waku?.[1] ? JSON.parse(waku[1]) : [],
      paymentFactoryAddress: paymentFactory?.[1] || '',
    };

    const remote = await fetchSettings();
    TENANT = remote.tenantId;
    AppConfig = {
      appName: remote.appName,
      primaryColor: remote.theme.primary,
      logoCid: remote.brand.logoCid,
      fiatKey: remote.fiatKey,
      feeAddress: remote.feeAddress ?? '',
      feeBps: remote.feeBps ?? 0,
      admins: remote.admins ?? [],
      rpcUrl: remote.rpcUrl,
      rpcFallbackUrls: remote.rpcFallbackUrls ?? [],
      wakuBootstrap: remote.wakuBootstrap ?? [],
      paymentFactoryAddress: remote.paymentFactoryAddress ?? '',
    };

    await AsyncStorage.multiSet([
      [TENANT_KEY, remote.tenantId],
      [NAME_KEY, remote.appName],
      [COLOR_KEY, remote.theme.primary],
      [LOGO_KEY, remote.brand.logoCid],
      [FIAT_KEY, remote.fiatKey ?? ''],
      [FEE_ADDR_KEY, remote.feeAddress ?? ''],
      [FEE_BPS_KEY, String(remote.feeBps ?? 0)],
      [ADMINS_KEY, JSON.stringify(remote.admins ?? [])],
      [RPC_URL_KEY, remote.rpcUrl],
      [RPC_FALLBACK_KEY, JSON.stringify(remote.rpcFallbackUrls ?? [])],
      [WAKU_BOOTSTRAP_KEY, JSON.stringify(remote.wakuBootstrap ?? [])],
      [PAYMENT_FACTORY_KEY, remote.paymentFactoryAddress ?? ''],
    ]);
  } catch (e) {
    errorLog('Error loading tenant settings:', e);
  }
}

export async function getTenant(): Promise<string> {
  if (!TENANT) {
    await loadTenantSettings();
  }
  return TENANT;
}

export async function getAppConfig(): Promise<TenantSettings> {
  if (!AppConfig) {
    await loadTenantSettings();
  }
  return AppConfig;
}

export async function getFeeSettings(): Promise<{
  feeAddress: string;
  feeBps: number;
}> {
  if (!AppConfig.feeAddress && !AppConfig.feeBps) {
    await loadTenantSettings();
  }
  return {
    feeAddress: AppConfig.feeAddress || '',
    feeBps: AppConfig.feeBps || 0,
  };
}

export async function getAdmins(): Promise<string[]> {
  if (!AppConfig.admins || AppConfig.admins.length === 0) {
    await loadTenantSettings();
  }
  return AppConfig.admins || [];
}
