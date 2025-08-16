import { setValue } from './tonKvStore';
import config from '../utils/appConfig';
import { ProductIndexItem } from '../types';

const ADDRESS =
  config.TON_PRODUCT_INDEX_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export async function setProductBatch(items: ProductIndexItem[]): Promise<void> {
  for (const item of items) {
    await setValue(ADDRESS, item.id, JSON.stringify(item));
  }
}
