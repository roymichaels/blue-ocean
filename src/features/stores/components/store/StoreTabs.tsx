import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { isReviewsEnabled } from '@/config/featureFlags';

type TabKey = 'products' | 'about' | 'reviews';

export default function StoreTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const reviewsEnabled = isReviewsEnabled();
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'products', label: t('stores.tabs.products') },
    { key: 'about', label: t('stores.tabs.about') },
  ];
  if (reviewsEnabled) {
    tabs.push({ key: 'reviews', label: t('stores.tabs.reviews') });
  }
  return (
    <View
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
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
                textAlign: isRTL ? 'right' : 'left',
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

