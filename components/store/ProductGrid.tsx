import React from 'react';
import { FlatList, View } from 'react-native';
import { Package } from 'lucide-react-native';
import EmptyState from '../ui/EmptyState';
import ProductCard from '../ProductCard';
import { Product } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProductGrid({ products }: { products: Product[] }) {
  const { colors } = useTheme();
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

