// STUB: NEAR removed test helper. Bolt will replace with Supabase-backed mocks.
import { notImplemented } from '@/services/nearStub';

export async function getSetting(_key: string): Promise<string | null> {
  return notImplemented('mock:getSetting');
}

export async function setSetting(_key: string, _value: string): Promise<void> {
  return notImplemented('mock:setSetting');
}

export async function getAdmins(): Promise<string[]> {
  return notImplemented('mock:getAdmins');
}

export async function setAdmins(_admins: string[]): Promise<void> {
  return notImplemented('mock:setAdmins');
}

export async function getAdminScopes(): Promise<Record<string, unknown>> {
  return notImplemented('mock:getAdminScopes');
}

export async function setAdminScopes(_scopes: Record<string, unknown>): Promise<void> {
  return notImplemented('mock:setAdminScopes');
}

export async function fetchSettings() {
  return notImplemented('mock:fetchSettings');
}

export const subscribeToSettingsWrites = async () => notImplemented('mock:subscribeToSettingsWrites');

export const __store = {} as Record<string, string>;
