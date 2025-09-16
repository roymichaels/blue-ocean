import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { ProductCard, ProductCardSkeleton } from '@/features/products';
import { Product } from '@/types';
import { useLanguage } from '@/ui/ThemeProvider';
import EmptyState from '@/shared/ui/EmptyState';
import { Filter, Plus } from 'lucide-react-native';
import { spacing } from '@/shared/ui/tokens';

interface ProductGridProps {
  tenantId?: string | null;
  products: Product[];
  isStoreOwner: boolean;
  onEdit: (product: Product) => void;
  getItemWidth: () => string;
  searchQuery: string;
  onAddProduct: () => void;
  loading?: boolean;
  onProductPress?: (product: Product) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const rowStyles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginBottom: spacing.spacer12 },
});

const ProductRow = React.memo(
  ({ item, onProductPress }: { item: Product; onProductPress?: (product: Product) => void }) => (
    <View style={rowStyles.flex}>
      <ProductCard
        product={item}
        onPress={onProductPress ? () => onProductPress(item) : undefined}
        style={rowStyles.card}
      />
    </View>
  ),
);

function ProductGrid({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tenantId,
  products,
  isStoreOwner,
  onEdit,
  getItemWidth,
  searchQuery,
  onAddProduct,
  loading,
  onProductPress,
  refreshing,
  onRefresh,
}: ProductGridProps) {
  const { t } = useLanguage();
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow item={item} onProductPress={onProductPress} />
    ),
    [onProductPress],
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
          <View key={idx} style={[styles.productWrapper, { width: getItemWidth() as any }]}>
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
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}

export default memo(ProductGrid);

const styles = StyleSheet.create({
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productWrapper: {
    marginBottom: spacing.spacer16,
  },
});

