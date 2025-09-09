import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { Category } from '@/types';
import { assertNearChain } from '@/services/chain';
import { canonicalJson } from '@/utils/serialization';

assertNearChain();

const ADDRESS = 'categories';

export async function getCategory(id: string): Promise<Category | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as Category) : null;
}

export async function setCategory(category: Category) {
  await setValue(ADDRESS, category.id, canonicalJson(category));
}

export async function removeCategory(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listCategories(): Promise<Category[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Category);
}
