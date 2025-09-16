import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';

const PIN_HASH_KEY = 'launch.pinHash';
const BIOMETRIC_KEY = 'launch.biometricEnabled';
const LAST_ACTIVE_KEY = 'launch.lastActiveAt';

export async function getPinHash(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return stored && stored.length > 0 ? stored : null;
  } catch {
    return null;
  }
}

export async function setPinHash(hash: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  } catch {}
}

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = await getPinHash();
    if (!stored) return false;
    return bcrypt.compare(pin, stored);
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    if (!stored) return false;
    return stored === '1' || stored === 'true';
  } catch {
    return false;
  }
}

export async function enableBiometric(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? '1' : '0');
  } catch {}
}

export async function getLastActiveAt(): Promise<number | null> {
  try {
    const stored = await SecureStore.getItemAsync(LAST_ACTIVE_KEY);
    if (!stored) return null;
    const parsed = Number.parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setLastActiveAt(value: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_ACTIVE_KEY, String(value));
  } catch {}
}

export async function clearSessionState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LAST_ACTIVE_KEY);
  } catch {}
}
