import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Category } from '../types';
import { requireEnv } from '../utils/appConfig';
import { assertTonChain } from './chain';

assertTonChain();

const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || '').toLowerCase();
const ADDRESS = CHAIN === 'ton' ? requireEnv('TON_CATEGORIES_ADDRESS') : 'ton:disabled';

export async function getCategory(id: string): Promise<Category | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as Category) : null;
}

export async function setCategory(category: Category) {
  await setValue(ADDRESS, category.id, JSON.stringify(category));
}

export async function removeCategory(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listCategories(): Promise<Category[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Category);
}
