// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { ProductIndexItem } from '@/types';
import { notImplemented } from '@/services/nearStub';

export function encodeProductIndexItem(_item: ProductIndexItem): string {
  return notImplemented('encodeProductIndexItem');
}

export function decodeProductIndexItem(
  _id: string,
  _data: string,
): ProductIndexItem {
  return notImplemented('decodeProductIndexItem');
}

export async function setProductBatch(_items: ProductIndexItem[]): Promise<void> {
  return notImplemented('setProductBatch');
}

export function estimateSetProductBatch(_items: ProductIndexItem[]): number {
  return notImplemented('estimateSetProductBatch');
}
