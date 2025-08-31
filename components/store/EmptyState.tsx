import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function EmptyState({
  title = 'No products yet',
  subtitle = 'When the owner adds items, they will appear here.',
}: {
  title?: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 }}>
      <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.text.secondary }}>{subtitle}</Text>
      <View style={{ height: 2, width: 120, backgroundColor: colors.gold, marginTop: 8, borderRadius: 1 }} />
    </View>
  );
}

