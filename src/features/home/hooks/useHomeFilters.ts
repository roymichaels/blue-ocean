import { useState, useMemo } from 'react';
import { Product } from '@/types';

export type SortOption = 'newest' | 'price-low' | 'price-high' | 'rating';

export function useHomeFilters(products: Product[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortModal, setShowSortModal] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q),
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min)) {
      filtered = filtered.filter((p) => p.price >= min);
    }
    if (!isNaN(max)) {
      filtered = filtered.filter((p) => p.price <= max);
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, minPrice, maxPrice, sortBy]);

  return {
    filteredProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sortBy,
    setSortBy,
    showSortModal,
    setShowSortModal,
  } as const;
}

export type UseHomeFiltersReturn = ReturnType<typeof useHomeFilters>;
