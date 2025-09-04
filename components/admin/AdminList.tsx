import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/ui/primitives/Text';
import Button from '@/ui/primitives/Button';
import { spacing, radius, colors } from '@/shared/ui/tokens';

export type AdminListItem = {
  id: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
};

export default function AdminList({ items, emptyText = 'Nothing yet.' }: { items: AdminListItem[]; emptyText?: string }) {
  if (!items.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {items.map((it) => (
        <Button
          key={it.id}
          onPress={it.onPress}
          style={styles.itemButton}
          accessibilityRole="button"
        >
          <Text style={styles.title}>{it.title}</Text>
          {it.subtitle ? <Text style={styles.subtitle}>{it.subtitle}</Text> : null}
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.spacer16,
  },
  emptyText: {
    color: colors.text.secondary,
  },
  itemButton: {
    marginBottom: spacing.spacer12,
    alignItems: 'flex-start',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: spacing.spacer4,
  },
});

