import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Category } from '@/types';
import { useTheme } from '@/ui/ThemeProvider';
import { spacing } from '@/shared/ui/tokens';

interface CategoryCardProps {
  category: Category;
  isStoreOwner: boolean;
  onPress: () => void;
  onEdit?: () => void;
}

export default function CategoryCard({ category, isStoreOwner, onPress, onEdit }: CategoryCardProps) {
  const { colors: themeColors } = useTheme();

  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
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
        {category.name}
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
    width: 70,
    position: 'relative',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spacer8,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryAdminActions: {
    position: 'absolute',
    top: -4,
    start: -4,
    flexDirection: 'row',
  },
  categoryAdminButton: {
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
    borderWidth: 1,
  },
});

