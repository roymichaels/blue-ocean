import Fuse from 'fuse.js';
import type { Product } from '@/types';

export interface ResultSet {
  products: Product[];
  total: number;
}

class LocalIndex {
  private fuse: Fuse<Product> | null = null;

  private products: Product[] = [];

  setProducts(products: Product[]) {
    this.products = products;
    if (products.length === 0) {
      this.fuse = null;
      return;
    }

    this.fuse = new Fuse(products, {
      keys: [
        'name',
        'name_en',
        'name_he',
        'description',
        'description_en',
        'description_he',
        'category',
      ],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }

  async query(text: string): Promise<ResultSet> {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        products: [...this.products],
        total: this.products.length,
      };
    }

    if (!this.fuse) {
      return {
        products: [],
        total: 0,
      };
    }

    const matches = this.fuse.search(trimmed);
    const products = matches.map((match) => match.item);

    return {
      products,
      total: products.length,
    };
  }
}

export const localIndex = new LocalIndex();
