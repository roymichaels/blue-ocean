// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { AdminScope } from '@/types';
import { notImplemented } from '@/services/nearStub';

export interface NearSettings {
  tenantId: string;
  appName: string;
  theme: { primary: string };
  brand: { logoCid: string };
  fiatKey?: string;
  feeAddress?: string;
  feeBps?: number;
  admins: string[];
  adminScopes: Record<string, AdminScope[]>;
  adminPublicKeys: string[];
  rpcUrl: string;
  rpcFallbackUrls?: string[];
  paymentFactoryAddress?: string;
}

export async function getSetting(_key: string): Promise<string | null> {
  return notImplemented('getSetting');
}

export async function setSetting(
  _key: string,
  _value: string,
  _actor?: string,
): Promise<void> {
  return notImplemented('setSetting');
}

export async function listSettings(): Promise<Array<{ key: string; value: string }>> {
  return notImplemented('listSettings');
}

export async function fetchSettings(): Promise<NearSettings> {
  return notImplemented('fetchSettings');
}

export async function getFeeBps(): Promise<number> {
  return notImplemented('getFeeBps');
}

export async function setFeeBps(_value: number, _actor: string): Promise<void> {
  return notImplemented('setFeeBps');
}

export async function getAdmins(): Promise<string[]> {
  return notImplemented('getAdmins');
}

export async function getAdminScopes(): Promise<Record<string, AdminScope[]>> {
  return notImplemented('getAdminScopes');
}

export async function setAdminScopes(
  _scopes: Record<string, AdminScope[]>,
  _actor: string,
): Promise<void> {
  return notImplemented('setAdminScopes');
}

export async function setAdmins(_admins: string[], _actor: string): Promise<void> {
  return notImplemented('setAdmins');
}

export async function getAdminPublicKeys(): Promise<string[]> {
  return notImplemented('getAdminPublicKeys');
}

export async function setAdminPublicKeys(_keys: string[], _actor: string): Promise<void> {
  return notImplemented('setAdminPublicKeys');
}

export async function getPaymentFactoryAddress(): Promise<string> {
  return notImplemented('getPaymentFactoryAddress');
}

export async function setPaymentFactoryAddress(_address: string, _actor: string): Promise<void> {
  return notImplemented('setPaymentFactoryAddress');
}

export async function subscribeToSettingsWrites(
  _cb: (event: unknown) => void,
): Promise<() => void> {
  return notImplemented('subscribeToSettingsWrites');
}
