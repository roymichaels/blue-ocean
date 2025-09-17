import React from 'react';
import { Pressable, Image, View, StyleSheet, ViewStyle } from 'react-native';
import { Star, Heart } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { Text, Button, Skeleton } from '@/ui';
import { spacing, radius, typography } from '@/ui/tokens';
import { Product } from '@/types';
import { useProductCard } from './hooks/useProductCard';
import { isReviewsEnabled } from '@/config/featureFlags';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onCTAPress?: () => void;
  style?: ViewStyle;
}

function ProductCard({ product, onPress, onCTAPress, style }: ProductCardProps) {
  const { colors } = useTheme();
  const {
    isInWishlist,
    handleWishlistPress,
    price,
    originalPrice,
  } = useProductCard(product);
  const reviewsEnabled = isReviewsEnabled();
  const imageUri = product.images && product.images[0] ? product.images[0] : null;
  const [imageStatus, setImageStatus] = React.useState<
    'loading' | 'loaded' | 'error'
  >(imageUri ? 'loading' : 'error');

  React.useEffect(() => {
    if (imageUri) {
      setImageStatus('loading');
    } else {
      setImageStatus('error');
    }
  }, [imageUri]);

  const accessibilityLabel = React.useMemo(() => {
    if (!price) {
      return product.name;
    }
    return `${product.name}, ${price}`;
  }, [price, product.name]);

  const showSkeleton = imageUri && imageStatus !== 'loaded';
  const shouldShowFallback = !imageUri || imageStatus === 'error';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface.primary }, style]}
    >
      <View style={styles.imageWrapper}>
        {shouldShowFallback ? (
          <View style={[styles.image, { backgroundColor: colors.muted }]} />
        ) : (
          <>
            <Image
              source={{ uri: imageUri! }}
              style={[styles.image, showSkeleton && styles.hiddenImage]}
              accessibilityRole="image"
              accessibilityLabel={product.name}
              onLoadStart={() => setImageStatus('loading')}
              onLoad={() => setImageStatus('loaded')}
              onError={() => setImageStatus('error')}
            />
            {showSkeleton ? (
              <Skeleton
                style={styles.imageSkeleton}
                accessibilityLabel="Loading product image"
              />
            ) : null}
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={handleWishlistPress}
          style={styles.wishlist}
        >
          <Heart
            size={16}
            color={isInWishlist ? colors.status.error : colors.text.primary}
            fill={isInWishlist ? colors.status.error : 'transparent'}
          />
        </Pressable>
      </View>
      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={[typography.sm, { fontWeight: '500', color: colors.text.primary }]}
        >
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          {originalPrice && (
            <Text
              style={[
                typography.sm,
                styles.originalPrice,
                { color: colors.text.secondary },
              ]}
            >
              {originalPrice}
            </Text>
          )}
          <Text
            style={[typography.md, { fontWeight: '600', color: colors.text.primary }]}
          >
            {price}
          </Text>
        </View>
        {reviewsEnabled ? (
          <View style={styles.ratingRow}>
            <Star size={12} color={colors.gold} />
            <Text
              style={[typography.xs, { fontWeight: '500', marginStart: spacing.spacer4, color: colors.text.primary }]}
            >
              {product.rating ?? 0}
            </Text>
          </View>
        ) : null}
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
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  hiddenImage: {
    opacity: 0,
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
  },
  wishlist: {
    position: 'absolute',
    top: spacing.spacer4,
    end: spacing.spacer4,
  },
  content: {
    padding: spacing.spacer8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.spacer4,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    marginEnd: spacing.spacer4,
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
