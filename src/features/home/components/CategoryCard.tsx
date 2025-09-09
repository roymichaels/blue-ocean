import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Category } from '@/types';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius, typography, shadows } from '@/shared/ui/tokens';

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
    width: 80,
    position: 'relative',
    padding: spacing.spacer8,
    borderRadius: radius.lg,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spacer8,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    ...typography.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  categoryAdminActions: {
    position: 'absolute',
    top: -4,
    start: -4,
    flexDirection: 'row',
  },
  categoryAdminButton: {
    borderRadius: radius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
    borderWidth: 1,
  },
});

