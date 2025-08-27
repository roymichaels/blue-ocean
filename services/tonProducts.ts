import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Product } from '../types';
import { requireEnv } from '../utils/appConfig';

const ADDRESS = requireEnv('TON_PRODUCTS_ADDRESS');

export async function getProduct(storeId: string = '', id: string): Promise<Product | null> {
  const res = await getValue(ADDRESS, `${storeId}:${id}`);
  if (!res) return null;
  const parsed = JSON.parse(res) as Product;
  return {
    ...parsed,
    pricingTier: parsed.pricingTier,
    variants: parsed.variants || [],
    colors: parsed.colors || [],
  };
}

export async function setProduct(storeId: string = '', product: Product) {
  await setValue(
    ADDRESS,
    `${storeId}:${product.id}`,
    JSON.stringify({
      ...product,
      pricingTier: product.pricingTier,
      variants: product.variants || [],
      colors: product.colors || [],
    })
  );
}

export async function removeProduct(storeId: string = '', id: string) {
  await removeValue(ADDRESS, `${storeId}:${id}`);
}

export async function listProducts(storeId: string = ''): Promise<Product[]> {
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${storeId}:`))
    .map((i) => {
      const parsed = JSON.parse(i.value) as Product;
      return {
        ...parsed,
        pricingTier: parsed.pricingTier,
        variants: parsed.variants || [],
        colors: parsed.colors || [],
      };
    });
}

export async function getProducts(storeId: string = '', ids: string[]): Promise<Product[]> {
  const res: Product[] = [];
  for (const id of ids) {
    const prod = await getProduct(storeId, id);
    if (prod) res.push(prod);
  }
  return res;
}

export async function setProductBatch(storeId: string = '', products: Product[]) {
  for (const p of products) {
    await setProduct(storeId, p);
  }
}

export async function estimateSetProductBatch(products: Product[]): Promise<number> {
  const payload = products.map(p => JSON.stringify(p)).join('');
  return payload.length;
}

export async function getVersion(): Promise<number> {
  return 0;
}
