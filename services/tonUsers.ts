import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { User } from '../types';
import { requireEnv } from '../utils/appConfig';
import { assertTonChain } from './chain';

assertTonChain();

const ADDRESS = requireEnv('TON_USERS_ADDRESS');

export async function getUser(id: string): Promise<User | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as User) : null;
}

export async function setUser(user: User) {
  await setValue(ADDRESS, user.id, JSON.stringify(user));
}

export async function removeUser(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listUsers(): Promise<User[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as User);
}
