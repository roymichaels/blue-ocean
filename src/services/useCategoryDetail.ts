import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import type { Category, Subcategory } from '@/types';

let getCategory: ((storeId: string, id: string) => Promise<Category | null>) | undefined;
let setCategory: ((storeId: string, category: Category) => Promise<void>) | undefined;
if (chain === 'near') {
  ({ getCategory, setCategory } = require('@/features/products/services/nearCategories'));
}

export function useCategoryDetail(id?: string, tenantId?: string) {
  const queryClient = useQueryClient();
  const storeId = tenantId ?? 'default';

  const { data: category = null, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => {
      if (!id || !getCategory) return Promise.resolve(null);
      return getCategory(storeId, id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (updated: Category) =>
      setCategory ? setCategory(storeId, updated) : Promise.resolve(),
    onSuccess: (_data, updated) => {
      queryClient.invalidateQueries({ queryKey: ['category', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
    },
  });

  const mutateSubcategories = async (
    transform: (subcategories: Subcategory[]) => Subcategory[],
  ) => {
    if (!category) return;
    const updated: Category = {
      ...category,
      subcategories: transform(category.subcategories ?? []),
    };
    await mutation.mutateAsync(updated);
  };

  const addSubcategory = (subcategory: Subcategory) =>
    mutateSubcategories((subcategories) => [...subcategories, subcategory]);

  const updateSubcategory = (
    subcategoryId: string,
    subcategory: Subcategory,
  ) =>
    mutateSubcategories((subcategories) =>
      subcategories.map((s) => (s.id === subcategoryId ? subcategory : s)),
    );

  const deleteSubcategory = (subcategoryId: string) =>
    mutateSubcategories((subcategories) =>
      subcategories.filter((s) => s.id !== subcategoryId),
    );

  return {
    category,
    subcategories: category?.subcategories ?? [],
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    isLoading: isLoading || mutation.isPending,
  };
}

