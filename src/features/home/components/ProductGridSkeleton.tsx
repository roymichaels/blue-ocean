import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProductCardSkeleton } from '@/components/ui/ProductCard';
import { spacing } from '@/shared/ui/tokens';

export default function ProductGridSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <View key={idx} style={styles.item}>
          <ProductCardSkeleton />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    width: '48%',
    marginBottom: spacing.spacer16,
  },
});

