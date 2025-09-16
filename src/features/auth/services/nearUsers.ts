import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { User } from '@/types';
import { assertNearChain } from '@/services/chain';
import { canonicalJson } from '@/utils/serialization';
import { createWarmCache } from '@/services/warmCache';
import type { DiffMessage } from '@/services/warmCache';
import { errorLog } from '@/utils/logger';

if (typeof assertNearChain === 'function') {
  try { assertNearChain(); } catch {}
}

const ADDRESS = 'users';
const USER_CACHE_TOPIC = '/blue-ocean/users/1';

async function hydrateUserLake(): Promise<Array<DiffMessage<User>>> {
  try {
    const entries = await listValues(ADDRESS);
    const diffs: Array<DiffMessage<User>> = [];
    for (const entry of entries) {
      try {
        const parsed = JSON.parse(entry.value) as User & { rev?: number; version?: number };
        const id = parsed.id || entry.key;
        if (!id) continue;
        const tsSource =
          (parsed.updatedAt && new Date(parsed.updatedAt).getTime()) ||
          (parsed.createdAt && new Date(parsed.createdAt).getTime()) ||
          Date.now();
        const ts = Number.isFinite(tsSource) ? tsSource : Date.now();
        const rev =
          (typeof parsed.rev === 'number' && parsed.rev) ||
          (typeof parsed.version === 'number' && parsed.version) ||
          1;
        diffs.push({ id, rev, op: 'set', value: parsed, ts });
      } catch (err) {
        errorLog('Invalid user snapshot', err);
      }
    }
    return diffs;
  } catch (err) {
    errorLog('Failed to hydrate users from NEAR Lake', err);
    return [];
  }
}

const userCache = createWarmCache<User>(USER_CACHE_TOPIC, {
  hydrateLake: hydrateUserLake,
});

export const usersWarmCache = {
  getById(id: string) {
    return userCache.getById(id);
  },
  subscribe(
    filter: (id: string, value: User | undefined) => boolean,
    cb: (id: string, value: User | undefined) => void,
  ) {
    return userCache.subscribe(filter, cb);
  },
  onSynced(cb: () => void) {
    return userCache.onSynced(cb);
  },
};

export async function getUser(id: string): Promise<User | null> {
  try {
    const cached = usersWarmCache.getById(id);
    if (cached) return cached;
  } catch {}
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as User) : null;
}

export async function setUser(user: User) {
  await setValue(ADDRESS, user.id, canonicalJson(user));
}

export async function removeUser(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listUsers(): Promise<User[]> {
  try {
    return userCache.values();
  } catch {}
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as User);
}

export { E_STALE_DATA, E_SYNC_LAG } from '@/services/warmCache';
