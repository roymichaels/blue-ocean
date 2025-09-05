import { Product } from '@/types';

export interface ProductAdapter {
  listProducts(storeId: string): Promise<Product[]>;
  setProduct(storeId: string, product: Product): Promise<void>;
  removeProduct(storeId: string, id: string): Promise<void>;
}

export default ProductAdapter;
