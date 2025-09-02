import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <View style={styles.priceRow}>
      <TextInput
        style={[
          styles.priceInput,
          {
            borderColor: colors.border.primary,
            color: colors.text.primary,
            marginEnd: 8,
          },
        ]}
        placeholder="Min"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
        value={minPrice}
        onChangeText={setMinPrice}
        textAlign="end"
      />
      <TextInput
        style={[
          styles.priceInput,
          { borderColor: colors.border.primary, color: colors.text.primary },
        ]}
        placeholder="Max"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
        value={maxPrice}
        onChangeText={setMaxPrice}
        textAlign="end"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  priceRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

