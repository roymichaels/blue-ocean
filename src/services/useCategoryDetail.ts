import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import type { Category, Subcategory } from '@/types';
import invariant from '@/utils/invariant';

let getCategory: ((storeId: string, id: string) => Promise<Category | null>) | undefined;
let setCategory: ((storeId: string, category: Category) => Promise<void>) | undefined;
if (chain === 'near') {
  ({ getCategory, setCategory } = require('@/features/products/services/nearCategories'));
}

export function useCategoryDetail(id: string | undefined, tenantId: string | null) {
  invariant(tenantId, 'tenantId required');
  const queryClient = useQueryClient();

  const { data: category = null, isLoading } = useQuery({
    queryKey: ['category', tenantId, id],
    queryFn: () =>
      id && tenantId && getCategory
        ? getCategory(tenantId, id)
        : Promise.resolve(null),
    enabled: !!id && !!tenantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (updated: Category) =>
      setCategory ? setCategory(tenantId, updated) : Promise.resolve(),
    onSuccess: (_data, updated) => {
      queryClient.invalidateQueries({ queryKey: ['category', tenantId, updated.id] });
      queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
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
    subcategoryId: string,
    subcategory: Subcategory,
  ) => {
    if (!category) return;
    const updated: Category = {
      ...category,
      subcategories: (category.subcategories ?? []).map((s) =>
        s.id === subcategoryId ? subcategory : s,
      ),
    };
    await mutation.mutateAsync(updated);
  };

  const deleteSubcategory = async (subcategoryId: string) => {
    if (!category) return;
    const updated: Category = {
      ...category,
      subcategories: (category.subcategories ?? []).filter(
        (s) => s.id !== subcategoryId,
      ),
    };
    await mutation.mutateAsync(updated);
  };

  return {
    category,
    subcategories: category?.subcategories ?? [],
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    isLoading: isLoading || mutation.isPending,
  };
}

