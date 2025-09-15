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
    await SecureStore.setItemAsync(
      `session-${record.token}`,
      JSON.stringify(record),
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
      if (raw) out.push(JSON.parse(raw));
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
