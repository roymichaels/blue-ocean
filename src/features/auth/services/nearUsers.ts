import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { User } from '@/types';
import { assertNearChain } from '@/services/chain';

assertNearChain();

const ADDRESS = 'users';

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
