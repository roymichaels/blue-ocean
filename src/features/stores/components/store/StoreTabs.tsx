import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type TabKey = 'products' | 'about' | 'reviews';

export default function StoreTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const { colors } = useTheme();
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'products', label: 'Products' },
    { key: 'about', label: 'About' },
    { key: 'reviews', label: 'Reviews' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.primary,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={{ paddingVertical: 10, paddingHorizontal: 12 }}
          >
            <Text
              style={{
                color: isActive ? colors.text.primary : colors.text.secondary,
                fontWeight: isActive ? ('700' as any) : '500',
              }}
            >
              {t.label}
            </Text>
            {isActive ? (
              <View
                style={{ height: 2, backgroundColor: colors.gold, marginTop: 6, borderRadius: 1 }}
              />
            ) : (
              <View style={{ height: 2, backgroundColor: 'transparent', marginTop: 6 }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

