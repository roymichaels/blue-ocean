import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'admin.invites';

async function readInvites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

export async function loadAdminInvites(): Promise<string[]> {
  return await readInvites();
}

export async function addAdminInvite(address: string): Promise<string[]> {
  const current = await readInvites();
  const normalized = address.trim();
  if (!normalized) return current;
  if (current.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
    return current;
  }
  const next = [...current, normalized];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeAdminInvite(address: string): Promise<string[]> {
  const current = await readInvites();
  const normalized = address.trim().toLowerCase();
  const next = current.filter((item) => item.toLowerCase() !== normalized);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export default {
  loadAdminInvites,
  addAdminInvite,
  removeAdminInvite,
};
