import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Product } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_PRODUCTS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function getProduct(id: string): Promise<Product | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as Product) : null;
}

export async function setProduct(product: Product) {
  await setValue(ADDRESS, product.id, JSON.stringify(product));
}

export async function removeProduct(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listProducts(): Promise<Product[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Product);
}
