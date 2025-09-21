import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Product } from '@/data/commerce';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { Card } from './Card';
import { InlineBadge } from './InlineBadge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { colors, typography } = useTheme();
  return (
    <Card accessibilityLabel={`View ${product.name}`} style={styles.card}>
      <Image source={{ uri: product.heroImage }} style={styles.image} resizeMode="cover" />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: '600' }}>{product.name}</Text>
          {product.isNew ? <InlineBadge label="New" tone="success" /> : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: typography.small }} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            ${product.price.amount.toFixed(2)} {product.price.currency}
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small }}>
            {product.rating.toFixed(1)} ★ · {product.deliveryEstimateMinutes} min
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 14,
  },
});
