import { sign } from '@noble/ed25519';
import type { Product } from '@/types';
import { canonicalJson } from '@/utils/serialization';
import { getPrivateKey, getPublicKeyHex } from '@/services/localIdentity';
import { publish } from '@/services/waku';

const PRODUCT_TOPIC = '/blue-ocean/products/1';

type ProductEventType = 'product.updated' | 'product.deleted';

type ProductDeletedPayload = {
  id: string;
  storeId: string;
  deletedAt: string;
};

async function buildSignedMessage<T extends Record<string, unknown>>(
  type: ProductEventType,
  payload: T,
) {
  const [priv, pub] = await Promise.all([getPrivateKey(), getPublicKeyHex()]);
  const sender = { publicKey: pub, role: 'admin' as const };
  const body = { type, payload, sender };
  const bytes = new TextEncoder().encode(
    canonicalJson({ type, payload, sender }),
  );
  const signature = await sign(bytes, priv);
  return {
    ...body,
    signature: Buffer.from(signature).toString('hex'),
  };
}

export async function publishProductUpdated(product: Product) {
  const normalized: Product = {
    ...product,
    isActive: product.isActive !== false,
  };
  const message = await buildSignedMessage('product.updated', normalized);
  await publish(PRODUCT_TOPIC, message);
  return message;
}

export async function publishProductDeleted(id: string, storeId: string) {
  const payload: ProductDeletedPayload = {
    id,
    storeId,
    deletedAt: new Date().toISOString(),
  };
  const message = await buildSignedMessage('product.deleted', payload);
  await publish(PRODUCT_TOPIC, message);
  return message;
}
