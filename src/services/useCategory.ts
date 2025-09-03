import { useMutation, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Category, Subcategory } from '@/types';

let setCategory: ((category: Category) => Promise<void>) | undefined;
if (chain === 'near') {
  ({ setCategory } = require('@/features/products/services/nearCategories'));
}

export function useCategory(category: Category | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updated: Category) =>
      setCategory ? setCategory(updated) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const addSubcategory = async (subcategory: Subcategory) => {
    if (!category) return;
    const updated: Category = {
      ...category,
      subcategories: [...(category.subcategories ?? []), subcategory],
    };
    await mutation.mutateAsync(updated);
  };

  const updateSubcategory = async (
    id: string,
    subcategory: Subcategory,
  ) => {
    if (!category) return;
    const updated: Category = {
      ...category,
      subcategories: (category.subcategories ?? []).map((s) =>
        s.id === id ? subcategory : s,
      ),
    };
    await mutation.mutateAsync(updated);
  };

  const deleteSubcategory = async (id: string) => {
    if (!category) return;
    const updated: Category = {
      ...category,
      subcategories: (category.subcategories ?? []).filter((s) => s.id !== id),
    };
    await mutation.mutateAsync(updated);
  };

  return {
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    isPending: mutation.isPending,
  };
}
