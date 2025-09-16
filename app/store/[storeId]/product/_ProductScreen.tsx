import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Heading, Text, Button, Skeleton } from '@/ui/primitives';
import { spacing, typography, radius } from '@/ui/tokens';
import SmartImage from '@/components/SmartImage';
import { useCurrency } from '@/contexts/CurrencyContext';
import CartService from '@/features/cart/services/cart';
import { useNotificationActions } from '@/components/NotificationContext';
import EmptyState from '@/shared/ui/EmptyState';
import { useAppRouter } from '@/services/useAppRouter';
import { useProductDetail } from '@/features/products/hooks/useProductDetail';
import { AlertTriangle, Heart, Minus, Plus, ShoppingCart } from 'lucide-react-native';

export default function ProductDetailScreen() {
  const { storeId, productId } = useLocalSearchParams<{ storeId: string; productId: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { currencySymbol } = useCurrency();
  const { showNotification } = useNotificationActions();
  const appRouter = useAppRouter();

  const {
    product,
    isLoading,
    refreshing,
    refresh,
    error,
    quantity,
    incrementQuantity,
    decrementQuantity,
    effectivePrice,
    totalPrice,
    currentPricingTier,
    showTieredPricing,
    media,
    mainImageUri,
    isFavorite,
    toggleFavorite,
    notFound,
  } = useProductDetail(productId ?? '', typeof storeId === 'string' ? storeId : undefined);

  const [adding, setAdding] = useState(false);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    setAdding(true);
    try {
      await CartService.getInstance().addToCart(product, quantity);
      showNotification(
        t('cart.addedTitle', 'Added to cart'),
        t('cart.addedMessage', 'The item was added to your cart.'),
        'success',
      );
    } catch (err) {
      showNotification(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('cart.addError', 'Could not add to cart.'),
        'error',
      );
    } finally {
      setAdding(false);
    }
  }, [product, quantity, showNotification, t]);

  const handleBack = useCallback(() => {
    if (storeId) {
      appRouter.push(`/store/${storeId}`);
    } else {
      appRouter.back();
    }
  }, [appRouter, storeId]);

  const priceLabel = useMemo(() => {
    if (!product) return '';
    return `${currencySymbol}${effectivePrice.toFixed(2)}`;
  }, [product, currencySymbol, effectivePrice]);

  if (!productId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('productDetail.missing', 'Product unavailable')}
        message={t('productDetail.missingDescription', 'This product identifier is invalid.')}
        actionText={t('common.back', 'Back')}
        onAction={handleBack}
      />
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('productDetail.notFound', 'Product not found')}
        message={t(
          'productDetail.notFoundDescription',
          'The item may have been removed or is unavailable in this store.',
        )}
        actionText={t('common.back', 'Back')}
        onAction={handleBack}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('productDetail.errorTitle', 'Unable to load product')}
        message={error.message}
        actionText={t('common.reload', 'Reload')}
        onAction={async () => {
          await refresh();
        }}
      />
    );
  }

  const renderSkeleton = () => (
    <View style={styles.skeletonCard}>
      <Skeleton height={220} borderRadius={radius.lg} />
      <View style={{ marginTop: spacing.spacer16, gap: spacing.spacer12 }}>
        <Skeleton height={24} width="60%" />
        <Skeleton height={16} width="80%" />
        <Skeleton height={48} width="100%" />
      </View>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: spacing.spacer16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
    >
      {isLoading || !product ? (
        renderSkeleton()
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }] }>
          <SmartImage
            uri={mainImageUri || product.images?.[0]}
            width={360}
            height={220}
            style={[styles.heroImage, { borderRadius: radius.lg }]}
            contentFit="cover"
          />
          <View style={{ marginTop: spacing.spacer16, gap: spacing.spacer12 }}>
            <Heading size="lg" style={{ color: colors.text.primary }}>
              {product.name}
            </Heading>
            <Text style={{ color: colors.text.secondary }}>{product.description}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text.primary }]}>{priceLabel}</Text>
              <TouchableOpacity
                onPress={toggleFavorite}
                accessibilityRole="button"
                style={styles.favoriteButton}
              >
                <Heart
                  size={20}
                  color={isFavorite ? colors.status.error : colors.text.secondary}
                  fill={isFavorite ? colors.status.error : 'transparent'}
                />
              </TouchableOpacity>
            </View>
            {showTieredPricing && currentPricingTier ? (
              <View style={[styles.tierNotice, { backgroundColor: colors.surface.secondary }] }>
                <Text style={{ color: colors.text.secondary }}>
                  {t('productDetail.tiered', 'Tier pricing')} · {currentPricingTier.name}
                </Text>
              </View>
            ) : null}
            <View style={styles.quantityRow}>
              <Text style={{ color: colors.text.primary, fontWeight: '600' }}>
                {t('productDetail.quantity', 'Quantity')}
              </Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  onPress={decrementQuantity}
                  accessibilityLabel={t('productDetail.decrease', 'Decrease quantity')}
                  style={[styles.quantityButton, { borderColor: colors.border.primary }]}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.quantityValue, { color: colors.text.primary }]}>{quantity}</Text>
                <TouchableOpacity
                  onPress={incrementQuantity}
                  accessibilityLabel={t('productDetail.increase', 'Increase quantity')}
                  style={[styles.quantityButton, { borderColor: colors.border.primary }]}
                  disabled={product.stock !== undefined && quantity >= product.stock}
                >
                  <Plus size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ color: colors.text.secondary }}>
              {t('productDetail.subtotal', 'Subtotal')}: {currencySymbol}
              {totalPrice.toFixed(2)}
            </Text>
            <View style={styles.stockRow}>
              <Text style={{ color: colors.text.secondary }}>
                {t('productDetail.stock', 'In stock')}: {product.stock ?? t('common.unknown', 'Unknown')}
              </Text>
            </View>
            <Button
              onPress={handleAddToCart}
              loading={adding}
              disabled={!product.stock || product.stock === 0}
              accessibilityLabel={t('productDetail.addToCart', 'Add to cart')}
            >
              <View style={styles.buttonContent}>
                <ShoppingCart size={18} color={colors.text.inverse} />
                <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
                  {t('productDetail.addToCart', 'Add to cart')}
                </Text>
              </View>
            </Button>
          </View>
        </View>
      )}
      {media?.length ? (
        <View style={{ marginTop: spacing.spacer24 }}>
          <Heading size="md" style={{ color: colors.text.primary }}>
            {t('productDetail.gallery', 'Gallery')}
          </Heading>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.spacer12, paddingVertical: spacing.spacer12 }}
          >
            {media.map((item) => (
              <SmartImage
                key={item.uri}
                uri={item.uri}
                width={120}
                height={120}
                style={{ borderRadius: radius.md }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.spacer16,
  },
  skeletonCard: {
    borderRadius: radius.xl,
    padding: spacing.spacer16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.spacer16,
  },
  price: {
    ...typography.xl,
    fontWeight: '700',
  },
  favoriteButton: {
    padding: spacing.spacer8,
  },
  tierNotice: {
    padding: spacing.spacer12,
    borderRadius: radius.md,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spacer12,
  },
  quantityButton: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.spacer8,
  },
  quantityValue: {
    minWidth: 32,
    textAlign: 'center',
    fontWeight: '600',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spacer8,
  },
  buttonText: {
    ...typography.md,
    fontWeight: '600',
  },
});

