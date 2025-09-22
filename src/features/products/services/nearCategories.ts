import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { Category } from '@/types';
import { assertNearChain } from '@/services/chain';
import { canonicalJson } from '@/utils/serialization';
import { requireStoreId } from '@blue-ocean/utils';

assertNearChain();

const ADDRESS = 'categories';

export async function getCategory(storeId: string, id: string): Promise<Category | null> {
  const sid = requireStoreId(storeId);
  const res = await getValue(ADDRESS, `${sid}:${id}`);
  return res ? (JSON.parse(res) as Category) : null;
}

export async function setCategory(storeId: string, category: Category) {
  const sid = requireStoreId(storeId);
  await setValue(ADDRESS, `${sid}:${category.id}`, canonicalJson(category));
}

export async function removeCategory(storeId: string, id: string) {
  const sid = requireStoreId(storeId);
  await removeValue(ADDRESS, `${sid}:${id}`);
}

export async function listCategories(storeId: string): Promise<Category[]> {
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${sid}:`))
    .map((i) => JSON.parse(i.value) as Category);
}
