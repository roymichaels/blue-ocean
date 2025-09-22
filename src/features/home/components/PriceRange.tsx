import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextField } from '@/ui';
import { spacing } from '@/shared/ui/tokens';
import { t } from '@/i18n';

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
        placeholder={t('priceRange.min')}
        keyboardType="numeric"
        textAlign="right"
        style={[styles.priceInput, { marginEnd: spacing.spacer8 }]}
      />
      <TextField
        value={maxPrice}
        onChangeText={setMaxPrice}
        placeholder={t('priceRange.max')}
        keyboardType="numeric"
        textAlign="right"
        style={[styles.priceInput]}
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

