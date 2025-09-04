import React from 'react';
import { Pressable, Image, View, StyleSheet, ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { Text, Button, Skeleton } from '@/ui';
import { spacing, radius, typography } from '@/ui/tokens';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onCTAPress?: () => void;
  style?: ViewStyle;
}

function ProductCard({ product, onPress, onCTAPress, style }: ProductCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface.primary }, style]}
    >
      {product.images && product.images[0] ? (
        <Image source={{ uri: product.images[0] }} style={styles.image} />
      ) : (
        <View style={[styles.image, { backgroundColor: colors.muted }]} />
      )}
      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={[typography.sm, { fontWeight: '500', color: colors.text.primary }]}
        >
          {product.name}
        </Text>
        <Text
          style={[typography.md, { fontWeight: '600', marginTop: spacing.spacer4, color: colors.text.primary }]}
        >
          {product.price}
        </Text>
        <View style={styles.ratingRow}>
          <Star size={12} color={colors.gold} />
          <Text
            style={[typography.xs, { fontWeight: '500', marginStart: spacing.spacer4, color: colors.text.primary }]}
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
      <Skeleton style={styles.image} />
      <View style={styles.content}>
        <Skeleton height={12} width="60%" borderRadius={radius.sm} />
        <Skeleton
          height={12}
          width="40%"
          borderRadius={radius.sm}
          style={{ marginTop: spacing.spacer4 }}
        />
        <Skeleton
          height={12}
          width={80}
          borderRadius={radius.sm}
          style={{ marginTop: spacing.spacer4 }}
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

export default React.memo(ProductCard);
