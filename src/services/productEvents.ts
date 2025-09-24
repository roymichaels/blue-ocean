import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import type { Product } from '@/types';
import { publish } from '@/services/waku';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';

const PRODUCT_TOPIC = '/blue-ocean/products/1';

function randomNonce(byteLength = 12): string {
  return Buffer.from(randomBytes(byteLength)).toString('hex');
}

export async function publishProductUpdated(product: Product) {
  const normalized: Product = {
    ...product,
    isActive: product.isActive !== false,
  };
  const ts = Date.now();
  const nonce = randomNonce();
  const message = await makeSignedWakuMessage(
    'product.updated',
    {
      product: normalized,
      ts,
      nonce,
    },
    'admin',
    { ts, nonce },
  );
  await publish(PRODUCT_TOPIC, message);
  return message;
}

export async function publishProductDeleted(id: string, storeId: string) {
  const ts = Date.now();
  const nonce = randomNonce();
  const message = await makeSignedWakuMessage(
    'product.deleted',
    {
      id,
      storeId,
      deletedAt: new Date().toISOString(),
      ts,
      nonce,
    },
    'admin',
    { ts, nonce },
  );
  await publish(PRODUCT_TOPIC, message);
  return message;
}
