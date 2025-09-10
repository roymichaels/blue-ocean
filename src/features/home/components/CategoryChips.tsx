import React, { useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/ui/primitives';
import { spacing, radius } from '@/ui/tokens';
import { Category } from '@/types';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';

interface CategoryChipsProps {
  tenantId?: string | null;
  categories: Category[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
}

function CategoryChips({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tenantId,
  categories,
  selectedCategory,
  setSelectedCategory,
}: CategoryChipsProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleSelectAll = useCallback(() => setSelectedCategory(null), [setSelectedCategory]);
  const handleSelectCategory = useCallback(
    (id: string) => () => setSelectedCategory(id),
    [setSelectedCategory],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('categories.all')}
          style={[
            styles.categoryChip,
            {
              borderColor: colors.border.primary,
              backgroundColor:
                selectedCategory === null ? colors.gold : 'transparent',
            },
          ]}
          onPress={handleSelectAll}
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
            accessibilityRole="button"
            accessibilityLabel={t(cat.name)}
            key={cat.id}
            style={[
              styles.categoryChip,
              {
                borderColor: colors.border.primary,
                backgroundColor:
                  selectedCategory === cat.id ? colors.gold : 'transparent',
              },
            ]}
            onPress={handleSelectCategory(cat.id)}
          >
            <Text
              style={{
                color:
                  selectedCategory === cat.id
                    ? colors.text.inverse
                    : colors.text.primary,
              }}
            >
              {t(cat.name)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default React.memo(CategoryChips);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
  categoriesScroll: {
    marginBottom: spacing.spacer8,
  },
  categoryChip: {
    paddingVertical: spacing.spacer12 / 2,
    paddingHorizontal: spacing.spacer12,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginEnd: spacing.spacer8,
  },
});

