import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import ProductCard, { ProductCardSkeleton } from '@/features/products/ProductCard';
import { Product, Category } from '@/types';
import { useLanguage } from '@/ui/ThemeProvider';
import EmptyState from '@/shared/ui/EmptyState';
import { Filter, Plus } from 'lucide-react-native';
import { spacing } from '@/shared/ui/tokens';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  isStoreOwner: boolean;
  onEdit: (product: Product) => void;
  getItemWidth: () => string;
  searchQuery: string;
  onAddProduct: () => void;
  loading?: boolean;
}

export default function ProductGrid({
  products,
  categories,
  isStoreOwner,
  onEdit,
  getItemWidth,
  searchQuery,
  onAddProduct,
  loading,
}: ProductGridProps) {
  const { t } = useLanguage();
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={rowStyles.flex}>
        <ProductCard key={item.id} product={item} style={{ marginBottom: spacing.spacer12 }} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const columnWrapperStyle = useMemo(
    () => ({ gap: spacing.spacer12, paddingHorizontal: spacing.spacer16 }),
    []
  );
  const contentContainerStyle = useMemo(
    () => ({ paddingVertical: spacing.spacer16 }),
    []
  );

  if (loading) {
    return (
      <View style={styles.productsGrid}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={idx} style={[styles.productWrapper, { width: getItemWidth() }]}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={searchQuery ? Filter : Plus}
        title={searchQuery ? t('home.noResults') : t('home.noProducts')}
        message={
          searchQuery
            ? t('home.tryDifferentSearch')
            : t('home.productsComingSoon')
        }
        actionText={
          isStoreOwner && !searchQuery ? t('subcategory.addProduct') : undefined
        }
        onAction={isStoreOwner && !searchQuery ? onAddProduct : undefined}
      />
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={columnWrapperStyle}
      contentContainerStyle={contentContainerStyle}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productWrapper: {
    marginBottom: 16,
  },
});

const rowStyles = StyleSheet.create({ flex: { flex: 1 } });

