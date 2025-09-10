import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Category } from '@/types';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius, typography, shadows } from '@/shared/ui/tokens';
import { Text } from '@/ui/primitives';

const shadowStyle = Platform.select(shadows.sm);

        
interface CategoryCardProps {
  category: Category;
  isStoreOwner: boolean;
  onPress: () => void;
  onEdit?: () => void;
}

export default function CategoryCard({ category, isStoreOwner, onPress, onEdit }: CategoryCardProps) {
  const { colors: themeColors } = useTheme();
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t(category.name)}
      style={[styles.categoryCard, { backgroundColor: themeColors.surface.primary }, shadowStyle]}
      onPress={onPress}
    >
      <View
        style={[
          styles.categoryIcon,
          {
            backgroundColor: themeColors.interactive.secondary,
            borderColor: themeColors.gold,
          },
        ]}
      >
        <Text style={styles.categoryEmoji}>{category.icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: themeColors.text.primary }]}>
        {t(category.name)}
      </Text>
      {isStoreOwner && (
        <View style={styles.categoryAdminActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('category.editCategory')}
            style={[
              styles.categoryAdminButton,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.gold,
              },
            ]}
            onPress={onEdit}
          >
            <Pencil size={10} color={themeColors.gold} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  categoryCard: {
    alignItems: 'center',
    width: spacing.spacer40 * 2, // 80px width ensures even grid layout
    position: 'relative',
    padding: spacing.spacer8,
    borderRadius: radius.lg,
  },
  categoryIcon: {
    width: spacing.spacer20 * 3,
    height: spacing.spacer20 * 3,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spacer8,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 28, // No token for emoji size; chosen for visual balance
  },
  categoryName: {
    ...typography.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  categoryAdminActions: {
    position: 'absolute',
    top: -spacing.spacer4,
    start: -spacing.spacer4,
    flexDirection: 'row',
  },
  categoryAdminButton: {
    borderRadius: radius.full,
    width: spacing.spacer20,
    height: spacing.spacer20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.spacer4 / 2, // Small gap; no token for 2px
    borderWidth: 1,
  },
});

