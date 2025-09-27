// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { User } from '@/types';
import { notImplemented } from '@/services/nearStub';

export const usersWarmCache: any = {
  getById: (..._args: any[]) => notImplemented('usersWarmCache.getById'),
  list: (..._args: any[]) => notImplemented('usersWarmCache.list'),
  subscribe: (..._args: any[]) => notImplemented('usersWarmCache.subscribe'),
  mutate: (..._args: any[]) => notImplemented('usersWarmCache.mutate'),
  onSynced: (..._args: any[]) => notImplemented('usersWarmCache.onSynced'),
};

export async function getUser(_id: string): Promise<User | null> {
  return notImplemented('getUser');
}

export async function setUser(_user: User): Promise<void> {
  return notImplemented('setUser');
}

export async function removeUser(_id: string): Promise<void> {
  return notImplemented('removeUser');
}

export async function listUsers(): Promise<User[]> {
  return notImplemented('listUsers');
}

export { E_STALE_DATA, E_SYNC_LAG } from '@/schemas/cache';
