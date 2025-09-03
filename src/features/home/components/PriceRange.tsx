import React from 'react';
import { View, StyleSheet } from 'react-native';
import TextField from '@/components/ui/TextField';
import { spacing } from '@/shared/ui/tokens';

interface PriceRangeProps {
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
}

export default function PriceRange({
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
}: PriceRangeProps) {
  return (
    <View style={styles.priceRow}>
      <TextField
        value={minPrice}
        onChangeText={setMinPrice}
        placeholder="Min"
        keyboardType="numeric"
        style={[styles.priceInput, { marginEnd: spacing.spacer8 }]}
        textAlign="end"
      />
      <TextField
        value={maxPrice}
        onChangeText={setMaxPrice}
        placeholder="Max"
        keyboardType="numeric"
        style={styles.priceInput}
        textAlign="end"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  priceRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
  priceInput: {
    flex: 1,
  },
});

