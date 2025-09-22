import * as SecureStore from 'expo-secure-store';
import type { SessionToken } from '@/services/session';

const INDEX_KEY = 'session-token-index';

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeIndex(list: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(list));
  } catch {}
}

export async function saveSession(record: SessionToken): Promise<void> {
  try {
    const payload = {
      token: record.token,
      scopes: record.scopes,
      exp: record.exp,
      deviceHash: record.deviceHash,
      ...(record.checkoutNonce ? { checkoutNonce: record.checkoutNonce } : {}),
      ...(record.sealed ? { sealed: record.sealed } : {}),
    } satisfies SessionToken;
    await SecureStore.setItemAsync(
      `session-${record.token}`,
      JSON.stringify(payload),
    );
    const idx = await readIndex();
    if (!idx.includes(record.token)) {
      idx.push(record.token);
      await writeIndex(idx);
    }
  } catch {}
}

export async function loadSessions(): Promise<SessionToken[]> {
  const idx = await readIndex();
  const out: SessionToken[] = [];
  for (const token of idx) {
    try {
      const raw = await SecureStore.getItemAsync(`session-${token}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<SessionToken> & {
        token?: unknown;
        scopes?: unknown;
        exp?: unknown;
        deviceHash?: unknown;
        sealed?: unknown;
        checkoutNonce?: unknown;
      };
      if (
        parsed &&
        typeof parsed.token === 'string' &&
        typeof parsed.deviceHash === 'string' &&
        parsed.deviceHash.length > 0 &&
        Array.isArray(parsed.scopes) &&
        parsed.scopes.every((s) => typeof s === 'string') &&
        typeof parsed.exp === 'number'
      ) {
        const sealed = parsed.sealed as SessionToken['sealed'];
        if (
          sealed !== undefined &&
          (
            !sealed ||
            typeof sealed !== 'object' ||
            typeof sealed.cipher !== 'string' ||
            typeof sealed.walletPublicKey !== 'string' ||
            typeof sealed.identityPublicKey !== 'string'
          )
        ) {
          continue;
        }
        const checkoutNonce =
          typeof parsed.checkoutNonce === 'string' && parsed.checkoutNonce.length > 0
            ? parsed.checkoutNonce
            : undefined;
        const record: SessionToken = sealed
          ? {
              token: parsed.token,
              scopes: parsed.scopes as string[],
              exp: parsed.exp,
              deviceHash: parsed.deviceHash,
              sealed,
              ...(checkoutNonce ? { checkoutNonce } : {}),
            }
          : {
              token: parsed.token,
              scopes: parsed.scopes as string[],
              exp: parsed.exp,
              deviceHash: parsed.deviceHash,
              ...(checkoutNonce ? { checkoutNonce } : {}),
            };
        out.push(record);
      }
    } catch {}
  }
  return out;
}

export async function removeSession(token: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`session-${token}`);
    const idx = await readIndex();
    const next = idx.filter((t) => t !== token);
    await writeIndex(next);
  } catch {}
}
