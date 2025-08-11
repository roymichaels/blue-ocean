import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Product } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_PRODUCTS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getProduct(id: string): Promise<Product | null> {
  const res = await getValue(ADDRESS, id);
  if (!res) return null;
  const parsed = JSON.parse(res) as Product;
  return { ...parsed, pricingTier: parsed.pricingTier, variants: parsed.variants || [] };
}

export async function setProduct(product: Product) {
  await setValue(
    ADDRESS,
    product.id,
    JSON.stringify({
      ...product,
      pricingTier: product.pricingTier,
      variants: product.variants || [],
    })
  );
}

export async function removeProduct(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listProducts(): Promise<Product[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => {
    const parsed = JSON.parse(i.value) as Product;
    return { ...parsed, pricingTier: parsed.pricingTier, variants: parsed.variants || [] };
  });
}
