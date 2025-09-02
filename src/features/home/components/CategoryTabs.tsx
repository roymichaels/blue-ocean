import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
}

export default function CategoryTabs({
  categories,
  selectedCategory,
  setSelectedCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
}: CategoryTabsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            {
              borderColor: colors.border.primary,
              backgroundColor:
                selectedCategory === null ? colors.gold : 'transparent',
            },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={{
              color:
                selectedCategory === null
                  ? colors.text.inverse
                  : colors.text.primary,
            }}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              {
                borderColor: colors.border.primary,
                backgroundColor:
                  selectedCategory === cat.id ? colors.gold : 'transparent',
              },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text
              style={{
                color:
                  selectedCategory === cat.id
                    ? colors.text.inverse
                    : colors.text.primary,
              }}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.priceRow}>
        <TextInput
          style={[
            styles.priceInput,
            {
              borderColor: colors.border.primary,
              color: colors.text.primary,
              marginRight: 8,
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
            {
              borderColor: colors.border.primary,
              color: colors.text.primary,
            },
          ]}
          placeholder="Max"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="numeric"
          value={maxPrice}
          onChangeText={setMaxPrice}
          textAlign="end"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

