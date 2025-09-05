import CHAIN from '@/config/chain';
import type { ProductAdapter } from './ProductAdapter';
import { listProducts as nearListProducts, setProduct as nearSetProduct, removeProduct as nearRemoveProduct } from './nearProducts';

const unsupported: ProductAdapter = {
  async listProducts() { return []; },
  async setProduct() { /* no-op */ },
  async removeProduct() { /* no-op */ },
};

export const productsAdapter: ProductAdapter = CHAIN === 'near'
  ? {
      listProducts: nearListProducts,
      setProduct: nearSetProduct,
      removeProduct: nearRemoveProduct,
    }
  : unsupported;

export type { ProductAdapter };
