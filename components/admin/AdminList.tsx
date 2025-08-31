import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

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
        <Pressable
          key={it.id}
          onPress={it.onPress}
          style={{ padding: 12, borderWidth: 1, borderColor: colors.border.primary, borderRadius: 10, marginBottom: 10, backgroundColor: colors.surface.primary }}
        >
          <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{it.title}</Text>
          {it.subtitle ? (
            <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{it.subtitle}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

