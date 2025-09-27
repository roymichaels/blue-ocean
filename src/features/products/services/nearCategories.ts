// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Category } from '@/types';
import { notImplemented } from '@/services/nearStub';

export async function getCategory(_storeId: string, _id: string): Promise<Category | null> {
  return notImplemented('getCategory');
}

export async function setCategory(_storeId: string, _category: Category): Promise<void> {
  return notImplemented('setCategory');
}

export async function removeCategory(_storeId: string, _id: string): Promise<void> {
  return notImplemented('removeCategory');
}

export async function listCategories(_storeId: string): Promise<Category[]> {
  return notImplemented('listCategories');
}
