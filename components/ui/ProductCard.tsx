import React from 'react';
import { Pressable, Image, View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Text from '@/shared/ui/Text';
import Button from '@/components/ui/Button';
import { spacing, radius } from '@/shared/ui/tokens';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onCTAPress?: () => void;
}

export default function ProductCard({ product, onPress, onCTAPress }: ProductCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface.primary }]}
    >
      {product.images && product.images[0] ? (
        <Image source={{ uri: product.images[0] }} style={styles.image} />
      ) : (
        <View style={[styles.image, { backgroundColor: colors.muted }]} />
      )}
      <View style={styles.content}>
        <Text
          variant="sm"
          weight="500"
          numberOfLines={1}
          style={{ color: colors.text.primary }}
        >
          {product.name}
        </Text>
        <Text
          variant="md"
          weight="600"
          style={{ marginTop: spacing.spacer4, color: colors.text.primary }}
        >
          {product.price}
        </Text>
        <View style={styles.ratingRow}>
          <Star size={12} color={colors.gold} />
          <Text
            variant="xs"
            weight="500"
            style={{ marginStart: spacing.spacer4, color: colors.text.primary }}
          >
            {product.rating ?? 0}
          </Text>
        </View>
        {onCTAPress && (
          <Button title="Buy" onPress={onCTAPress} style={styles.cta} />
        )}
      </View>
    </Pressable>
  );
}

export function ProductCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.primary }]}
      accessibilityLabel="loading product"
    >
      <View style={[styles.image, { backgroundColor: colors.surface.secondary }]} />
      <View style={styles.content}>
        <View
          style={{
            height: 12,
            width: '60%',
            backgroundColor: colors.surface.secondary,
            borderRadius: radius.sm,
          }}
        />
        <View
          style={{
            height: 12,
            width: '40%',
            backgroundColor: colors.surface.secondary,
            borderRadius: radius.sm,
            marginTop: spacing.spacer4,
          }}
        />
        <View
          style={{
            height: 12,
            width: 80,
            backgroundColor: colors.surface.secondary,
            borderRadius: radius.sm,
            marginTop: spacing.spacer4,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  content: {
    padding: spacing.spacer8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.spacer4,
  },
  cta: {
    marginTop: spacing.spacer8,
  },
});

