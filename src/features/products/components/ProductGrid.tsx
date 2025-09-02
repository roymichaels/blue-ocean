import React, { useCallback, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import EmptyState from '@/shared/ui/EmptyState';
import ProductCard from './ProductCard';
import { Product } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { Package } from 'lucide-react-native';

const ProductRow = React.memo(
  ({ item, borderColor }: { item: Product; borderColor: string }) => (
    <View style={{ flex: 1 }}>
      <ProductCard
        product={item}
        style={{ marginBottom: 12, borderColor }}
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
    () => ({ gap: 12, paddingHorizontal: 16 }),
    []
  );
  const contentContainerStyle = useMemo(
    () => ({ paddingVertical: 16 }),
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

