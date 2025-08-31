import React from 'react';
import { FlatList, View } from 'react-native';
import EmptyState from './EmptyState';
import ProductCard from '../ProductCard';
import { Product } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProductGrid({ products }: { products: Product[] }) {
  const { colors } = useTheme();
  if (!products || products.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
      contentContainerStyle={{ paddingVertical: 16 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <ProductCard product={item} style={{ marginBottom: 12, borderColor: colors.border.primary }} />
        </View>
      )}
    />
  );
}

