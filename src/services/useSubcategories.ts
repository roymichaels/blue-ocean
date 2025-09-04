import { useCategories } from './useCategories';
import { useCategory } from './useCategory';
import { Subcategory } from '@/types';

export function useSubcategories(categoryId?: string) {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const category = categories.find((cat) => cat.id === categoryId) || null;
  const subcategories: Subcategory[] = category?.subcategories ?? [];
  const {
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    isPending,
  } = useCategory(category);

  return {
    category,
    subcategories,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    isLoading: categoriesLoading || isPending,
  };
}
