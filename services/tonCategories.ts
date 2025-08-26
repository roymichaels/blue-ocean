import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Category } from '../types';
import { requireEnv } from '../utils/appConfig';

const ADDRESS = requireEnv('TON_CATEGORIES_ADDRESS');

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
