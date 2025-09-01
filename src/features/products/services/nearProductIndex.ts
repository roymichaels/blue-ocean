import { Buffer } from 'buffer';
import { ProductIndexItem } from '@/types';
import nearAuth from '../../auth/services/nearAuth';
import { assertNearChain } from '@/services/chain';

assertNearChain();

export function encodeProductIndexItem(item: ProductIndexItem): string {
  return JSON.stringify(item);
}

export function decodeProductIndexItem(
  id: string,
  data: string,
): ProductIndexItem {
  const parsed = JSON.parse(data);
  return { id, ...parsed };
}

function buildBatch(items: ProductIndexItem[]): string {
  return JSON.stringify(items);
}

export async function setProductBatch(
  items: ProductIndexItem[],
): Promise<void> {
  const payload = buildBatch(items);
  await nearAuth.signMessage(Buffer.from(payload));
}

export function estimateSetProductBatch(items: ProductIndexItem[]): number {
  return buildBatch(items).length;
}

