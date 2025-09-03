import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { Category, Subcategory } from '@/types';
import { assertNearChain } from '@/services/chain';
import { getNearContract } from '@/utils/nearEnv';

assertNearChain();

const ADDRESS = getNearContract('CATEGORIES');

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

export async function setSubcategory(subcategory: Subcategory) {
  const category = await getCategory(subcategory.categoryId);
  if (!category) throw new Error('Category not found');
  const list = category.subcategories || [];
  const index = list.findIndex((s) => s.id === subcategory.id);
  if (index >= 0) {
    list[index] = subcategory;
  } else {
    list.push(subcategory);
  }
  category.subcategories = list;
  await setCategory(category);
}

export async function removeSubcategory(categoryId: string, subcategoryId: string) {
  const category = await getCategory(categoryId);
  if (!category) throw new Error('Category not found');
  category.subcategories = (category.subcategories || []).filter(
    (s) => s.id !== subcategoryId,
  );
  await setCategory(category);
}
