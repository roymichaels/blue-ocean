import chain from './chain';
import { Subcategory } from '@/types';

let setSubcategory: ((subcategory: Subcategory) => Promise<void>) | undefined;
let removeSubcategory: ((categoryId: string, subcategoryId: string) => Promise<void>) | undefined;

if (chain === 'near') {
  ({ setSubcategory, removeSubcategory } = require('@/features/products/services/nearCategories'));
}

export { setSubcategory, removeSubcategory };
