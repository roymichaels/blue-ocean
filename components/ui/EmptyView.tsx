import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function EmptyView({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
      <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 }}>{subtitle}</Text>
      ) : null}
      {cta ? (
        <Pressable onPress={cta.onPress} style={{ backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
          <Text style={{ color: colors.text.inverse, fontWeight: '700' }}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

