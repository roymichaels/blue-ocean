import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Product } from '../types';
import { requireEnv } from '../utils/appConfig';
import { assertTonChain } from './chain';
import { requireStoreId } from '@blue-ocean/utils';

assertTonChain();

const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || '').toLowerCase();
const ADDRESS = CHAIN === 'ton' ? requireEnv('TON_PRODUCTS_ADDRESS') : 'ton:disabled';
const DISABLED = ADDRESS === 'ton:disabled';
let SEEDED = false;

function ensureSeed() {
  if (!DISABLED || SEEDED) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('../assets/seed/seed-data.json');
    if (data?.products) {
      for (const p of data.products as Product[]) {
        void setValue(ADDRESS, `${p.storeId}:${p.id}`, JSON.stringify({
          ...p,
          pricingTier: p.pricingTier,
          variants: p.variants || [],
          colors: p.colors || [],
        }));
      }
    }
  } catch {}
  SEEDED = true;
}

export async function getProduct(storeId: string, id: string): Promise<Product | null> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  const res = await getValue(ADDRESS, `${sid}:${id}`);
  if (!res) return null;
  const parsed = JSON.parse(res) as Product;
  return {
    ...parsed,
    pricingTier: parsed.pricingTier,
    variants: parsed.variants || [],
    colors: parsed.colors || [],
  };
}

export async function setProduct(storeId: string, product: Product) {
  const sid = requireStoreId(storeId);
  await setValue(
    ADDRESS,
    `${sid}:${product.id}`,
    JSON.stringify({
      ...product,
      pricingTier: product.pricingTier,
      variants: product.variants || [],
      colors: product.colors || [],
    })
  );
}

export async function removeProduct(storeId: string, id: string) {
  const sid = requireStoreId(storeId);
  await removeValue(ADDRESS, `${sid}:${id}`);
}
export async function listProducts(storeId: string): Promise<Product[]> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${sid}:`))
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

export async function getProducts(storeId: string, ids: string[]): Promise<Product[]> {
  const sid = requireStoreId(storeId);
  const res: Product[] = [];
  for (const id of ids) {
    const prod = await getProduct(sid, id);
    if (prod) res.push(prod);
  }
  return res;
}

export async function setProductBatch(storeId: string, products: Product[]) {
  const sid = requireStoreId(storeId);
  for (const p of products) {
    await setProduct(sid, p);
  }
}

export async function estimateSetProductBatch(products: Product[]): Promise<number> {
  const payload = products.map(p => JSON.stringify(p)).join('');
  return payload.length;
}

export async function getVersion(): Promise<number> {
  return 0;
}
