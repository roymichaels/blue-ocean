import { Buffer } from 'buffer';
import { ProductIndexItem } from '@/types';
import { chainAdapter, assertNearChain } from '@/services/chain';
import { canonicalJson } from '@/utils/serialization';

assertNearChain();

export function encodeProductIndexItem(item: ProductIndexItem): string {
  return canonicalJson(item);
}

export function decodeProductIndexItem(
  id: string,
  data: string,
): ProductIndexItem {
  const parsed = JSON.parse(data);
  return { id, ...parsed };
}

function buildBatch(items: ProductIndexItem[]): string {
  return canonicalJson(items);
}

export async function setProductBatch(
  items: ProductIndexItem[],
): Promise<void> {
  const payload = buildBatch(items);
  await chainAdapter.signMessage?.(Buffer.from(payload));
}

export function estimateSetProductBatch(items: ProductIndexItem[]): number {
  return buildBatch(items).length;
}

