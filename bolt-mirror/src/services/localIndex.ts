import Fuse from 'fuse.js';
import type { Product } from '@/types';
import { normalizeHebrew } from '@/utils/strings';

export interface ResultSet {
  products: Product[];
  total: number;
}

const normalizeSearchValue = (
  value: unknown,
): string | readonly string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? normalizeHebrew(entry) : null))
      .filter((entry): entry is string => entry !== null);
  }

  if (typeof value === 'string') {
    return normalizeHebrew(value);
  }

  if (value == null) {
    return '';
  }

  return String(value);
};

export class LocalIndex {
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
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        return normalizeSearchValue(value);
      },
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

    const normalizedQuery = normalizeHebrew(trimmed);
    const matches = this.fuse.search(normalizedQuery);
    const products = matches.map((match) => match.item);

    return {
      products,
      total: products.length,
    };
  }
}

export const localIndex = new LocalIndex();
