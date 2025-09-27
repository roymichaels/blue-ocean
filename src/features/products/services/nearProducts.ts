// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Product } from '@/types';
import { notImplemented } from '@/services/nearStub';

export const productsWarmCache: any = {
  getById: (..._args: any[]) => notImplemented('productsWarmCache.getById'),
  list: (..._args: any[]) => notImplemented('productsWarmCache.list'),
  subscribe: (..._args: any[]) => notImplemented('productsWarmCache.subscribe'),
  mutate: (..._args: any[]) => notImplemented('productsWarmCache.mutate'),
  onSynced: (..._args: any[]) => notImplemented('productsWarmCache.onSynced'),
};

export async function getProduct(_storeId: string, _id: string): Promise<Product | null> {
  return notImplemented('getProduct');
}

export async function setProduct(_storeId: string, _product: Product): Promise<void> {
  return notImplemented('setProduct');
}

export async function removeProduct(_storeId: string, _id: string): Promise<void> {
  return notImplemented('removeProduct');
}

export async function listProducts(_storeId: string): Promise<Product[]> {
  return notImplemented('listProducts');
}

export async function getProducts(_storeId: string, _ids: string[]): Promise<Product[]> {
  return notImplemented('getProducts');
}

export async function setProductBatch(_storeId: string, _products: Product[]): Promise<void> {
  return notImplemented('setProductBatch');
}

export async function estimateSetProductBatch(_products: Product[]): Promise<number> {
  return notImplemented('estimateSetProductBatch');
}

export async function getVersion(): Promise<number> {
  return notImplemented('getVersion');
}
