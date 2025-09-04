import React, { useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import EmptyState from '@/shared/ui/EmptyState';
import ProductCard from '../ProductCard';
import { Product } from '@/types';
import { useTheme } from '@/ui/ThemeProvider';
import { Package } from 'lucide-react-native';
import { spacing } from '@/shared/ui/tokens';

const rowStyles = StyleSheet.create({ flex: { flex: 1 } });

const ProductRow = React.memo(
  ({ item, borderColor }: { item: Product; borderColor: string }) => (
    <View style={rowStyles.flex}>
      <ProductCard
        key={item.id}
        product={item}
        style={{ marginBottom: spacing.spacer12, borderColor }}
      />
    </View>
  )
);

export default function ProductGrid({ products }: { products: Product[] }) {
  const { colors } = useTheme();

  const borderColor = colors.border.primary;
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow item={item} borderColor={borderColor} />
    ),
    [borderColor]
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

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products yet"
        message="When the owner adds items, they will appear here."
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

