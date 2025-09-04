import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
}

export default function CategoryChips({
  categories,
  selectedCategory,
  setSelectedCategory,
}: CategoryChipsProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

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
            {t('categories.all')}
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
});

