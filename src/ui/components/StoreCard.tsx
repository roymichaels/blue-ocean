import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Store } from '@/data/commerce';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { Card } from './Card';
import { Chip } from './Chip';
import { InlineBadge } from './InlineBadge';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Card accessibilityLabel={`Open store ${store.name}`}>
      <View style={{ gap: spacing.sm }}>
        <Image source={{ uri: store.heroImage }} style={styles.image} resizeMode="cover" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: typography.heading, fontWeight: '600' }}>{store.name}</Text>
          <InlineBadge
            label={`${store.rating.toFixed(2)} ★`}
            tone={store.rating > 4.8 ? 'success' : 'default'}
          />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: typography.body }}>{store.tagline}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {store.categories.map((category) => (
            <Chip key={category} label={category} />
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: typography.small, fontWeight: '500' }}>
          {store.openNow ? 'Open now' : 'Opens tomorrow'} · {store.distanceMinutes} min away
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
});
