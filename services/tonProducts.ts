import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Product } from '../types';
import config from '../utils/appConfig';
import { withTonWeb } from './tonProvider';

const ADDRESS =
  config.TON_PRODUCTS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getProduct(id: string): Promise<Product | null> {
  const res = await getValue(ADDRESS, id);
  if (!res) return null;
  const parsed = JSON.parse(res) as Product;
  return {
    ...parsed,
    pricingTier: parsed.pricingTier,
    variants: parsed.variants || [],
    colors: parsed.colors || [],
  };
}

export async function setProduct(product: Product) {
  await setValue(
    ADDRESS,
    product.id,
    JSON.stringify({
      ...product,
      pricingTier: product.pricingTier,
      variants: product.variants || [],
      colors: product.colors || [],
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
    return {
      ...parsed,
      pricingTier: parsed.pricingTier,
      variants: parsed.variants || [],
      colors: parsed.colors || [],
    };
  });
}

export async function getProducts(ids: string[]): Promise<Product[]> {
  const res: Product[] = [];
  for (const id of ids) {
    const prod = await getProduct(id);
    if (prod) res.push(prod);
  }
  return res;
}

export async function setProductBatch(products: Product[]) {
  for (const p of products) {
    await setProduct(p);
  }
}

export async function estimateSetProductBatch(products: Product[]): Promise<number> {
  const payload = products.map(p => JSON.stringify(p)).join('');
  return payload.length;
}

export async function getVersion(): Promise<number> {
  try {
    return await withTonWeb(async tw => {
      const result = await tw.provider.call(ADDRESS, 'getVersion', []);
      const ver = result.stack?.[0]?.[1]?.number ?? result.stack?.[0]?.[1]?.value ?? '0';
      return Number(ver);
    });
  } catch {
    return 0;
  }
}
