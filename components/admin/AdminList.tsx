import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '@/ui/primitives/Button';

export type AdminListItem = {
  id: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
};

export default function AdminList({ items, emptyText = 'Nothing yet.' }: { items: AdminListItem[]; emptyText?: string }) {
  const { colors } = useTheme();
  if (!items.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text.secondary }}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <View style={{ padding: 16 }}>
      {items.map((it) => (
        <Button
          key={it.id}
          onPress={it.onPress}
          style={{
            marginBottom: 10,
            alignItems: 'flex-start',
            backgroundColor: colors.surface.primary,
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{it.title}</Text>
          {it.subtitle ? (
            <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{it.subtitle}</Text>
          ) : null}
        </Button>
      ))}
    </View>
  );
}

