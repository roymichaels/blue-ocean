import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '@/types';
import { localIndex, type ResultSet } from '@/services/localIndex';
import { isReviewsEnabled } from '@/config/featureFlags';

export type SortOption = 'newest' | 'price-low' | 'price-high' | 'rating';

export function useHomeFilters(products: Product[]) {
  const reviewsEnabled = isReviewsEnabled();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>(products);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortModal, setShowSortModal] = useState(false);

  const queryRef = useRef(searchQuery);

  useEffect(() => {
    queryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    if (!reviewsEnabled && sortBy === 'rating') {
      setSortBy('newest');
    }
  }, [reviewsEnabled, sortBy]);

  useEffect(() => {
    localIndex.setProducts(products);

    let active = true;
    const syncResults = async () => {
      try {
        const { products: results } = await localIndex.query(queryRef.current);
        if (!active) return;
        setSearchResults(results);
      } catch {
        if (!active) return;
        setSearchResults([...products]);
      }
    };

    void syncResults();

    return () => {
      active = false;
    };
  }, [products]);

  const applySearchResults = useCallback(
    (query: string, resultSet: ResultSet) => {
      setSearchQuery(query);
      setSearchResults(resultSet.products);
    },
    [],
  );

  const filteredProducts = useMemo(() => {
    let filtered = searchResults;

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!Number.isNaN(min)) {
      filtered = filtered.filter((p) => p.price >= min);
    }
    if (!Number.isNaN(max)) {
      filtered = filtered.filter((p) => p.price <= max);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          if (!reviewsEnabled) {
            return (
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
            );
          }
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'newest':
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });
  }, [maxPrice, minPrice, reviewsEnabled, searchResults, selectedCategory, sortBy]);

  return {
    filteredProducts,
    searchQuery,
    setSearchQuery,
    applySearchResults,
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
