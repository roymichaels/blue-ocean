import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  I18nManager,
  Platform,
} from 'react-native';
import SmartImage from '@/components/SmartImage';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/hooks';
import useCart from '../hooks/useCart';
import { spacing, radius, zIndex, typography } from '@/shared/ui/tokens';
import debounce from '@/utils/debounce';
import { platformShadow } from '@/utils/shadow';
import { Card } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { routes } from '@/utils/routes';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export default function FloatingCartWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(spacing.spacer20 * 3));
  const [animatedOpacity] = useState(new Animated.Value(0));
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const { t } = useLanguage();
  const isRTL = I18nManager.isRTL;
  const { cartItems, updateQuantity, removeItem, getTotal, getTotalItems } = useCart();
  const { push } = useAppRouter();

  const itemCount = useMemo(() => cartItems.length, [cartItems]);
  const totalItems = useMemo(() => getTotalItems(), [getTotalItems]);
  const totalAmount = useMemo(() => getTotal(), [getTotal]);
  const hasItems = useMemo(() => itemCount > 0, [itemCount]);

  const animateOpacity = useCallback(
    (visible: boolean) => {
      Animated.timing(animatedOpacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        if (!visible) setIsExpanded(false);
      });
    },
    [animatedOpacity]
  );

  const animateHeight = useCallback(
    (expanded: boolean, count: number) => {
      Animated.timing(animatedHeight, {
        toValue: expanded
          ? Math.min(
              spacing.spacer40 * 7 + spacing.spacer20,
              count * spacing.spacer40 * 2 + spacing.spacer40 * 3
            )
          : spacing.spacer20 * 3,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    },
    [animatedHeight]
  );

  const debouncedAnimateHeight = useMemo(
    () => debounce(animateHeight, 100),
    [animateHeight]
  );

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    debouncedAnimateHeight(newExpanded, itemCount);
  }, [isExpanded, debouncedAnimateHeight, itemCount]);

  useEffect(() => {
    animateOpacity(hasItems);
  }, [hasItems, animateOpacity]);

  useEffect(() => {
    if (isExpanded) {
      debouncedAnimateHeight(true, itemCount);
    }
  }, [itemCount, isExpanded, debouncedAnimateHeight]);

  const goToCheckout = useCallback(() => {
    setIsExpanded(false);
    push(routes.home({ showCart: 'true' }));
  }, [push]);

  if (!hasItems) {
    return null;
  }

  return (
    <AnimatedCard
      style={[
        styles.container,
        {
          opacity: animatedOpacity,
          height: animatedHeight,
          backgroundColor: colors.surface.elevated,
          borderColor: colors.border.primary,
          ...platformShadow('lg'),
        },
      ]}
    >
      <Stack>
        {/* Header */}
        <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <View style={[styles.cartIcon, { backgroundColor: colors.gold }]}>
            <ShoppingCart
              size={spacing.spacer20}
              color={colors.text.inverse}
              style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
            />
            <View style={[styles.itemCount, { backgroundColor: colors.status.error }]}>
              <Text style={[styles.itemCountText, { color: colors.text.primary }]}>{totalItems}</Text>
            </View>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {t('cart.cartTitle')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.gold }]} numberOfLines={1}>
              {currencySymbol}
              {totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.productPreview, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {cartItems.slice(0, 3).map((item, index) => (
              <SmartImage
                key={item.id}
                uri={item.product.images[0]}
                width={spacing.spacer16 * 2}
                height={spacing.spacer16 * 2}
                style={[
                  styles.previewImage,
                  {
                    marginStart: index > 0 ? -spacing.spacer8 : 0,
                    zIndex: 3 - index,
                    borderColor: colors.background,
                  }
                ]}
                contentFit="cover"
              />
            ))}
            {cartItems.length > 3 && (
              <View
                style={[
                  styles.moreItems,
                  {
                    marginStart: -spacing.spacer8,
                    borderColor: colors.background,
                    backgroundColor: colors.interactive.disabled,
                  }
                ]}
              >
                <Text style={[styles.moreItemsText, { color: colors.text.inverse }]}>{`+${cartItems.length - 3}`}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <ScrollView 
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((item) => (
              <View key={item.id} style={[styles.cartItem, { 
                borderBottomColor: colors.border.secondary 
              }]}>
                <SmartImage
                  uri={item.product.images[0]}
                  width={spacing.spacer40}
                  height={spacing.spacer40}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.gold }]}>
                    {currencySymbol}{(item.unitPrice ?? item.product.price).toFixed(2)}
                  </Text>
                    {item.tierName && (
                      <Text style={[styles.tierInfo, { color: colors.text.secondary }]}>
                        {'\n'}
                        {`${item.tierName} • EQ ${item.effectiveQty}`}
                      </Text>
                    )}
                </View>

                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={[styles.quantityButton, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus size={spacing.spacer12} color={colors.text.primary} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.quantity, { color: colors.text.primary }]}>{item.quantity}</Text>
                  
                  <TouchableOpacity
                    style={[styles.quantityButton, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus size={spacing.spacer12} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.removeButton, { 
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.border.primary 
                  }]}
                  onPress={() => removeItem(item.id)}
                >
                  <X size={spacing.spacer12} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
            <TouchableOpacity style={[styles.checkoutButton, { backgroundColor: colors.gold }]} onPress={goToCheckout}>
              <Text style={[styles.checkoutButtonText, { color: colors.text.inverse }]}>
                {t('cart.proceedToPaymentTotal', {
                  total: `${currencySymbol}${totalAmount.toFixed(2)}`,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        )}
      </Stack>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.spacer40 * 4 + spacing.spacer20 / 2,
    start: spacing.spacer16,
    end: spacing.spacer16,
    borderRadius: radius.xl,
    zIndex: zIndex.modal,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.spacer16,
    height: spacing.spacer20 * 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartIcon: {
    position: 'relative',
    width: spacing.spacer40,
    height: spacing.spacer40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.spacer12,
  },
  itemCount: {
    position: 'absolute',
    top: -spacing.spacer4,
    end: -spacing.spacer4,
    borderRadius: radius.md,
    minWidth: spacing.spacer16,
    height: spacing.spacer16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.spacer4,
  },
  itemCountText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  headerRight: {
    marginStart: spacing.spacer12,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    borderRadius: radius.xl,
    borderWidth: 2,
  },
  moreItems: {
    width: spacing.spacer16 * 2,
    height: spacing.spacer16 * 2,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  moreItemsText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  expandedContent: {
    flex: 1,
    borderTopWidth: 1,
  },
  itemsList: {
    flex: 1,
    maxHeight: spacing.spacer40 * 5,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.spacer12,
    borderBottomWidth: 1,
  },
  itemImage: {
    borderRadius: radius.md,
    marginEnd: spacing.spacer12,
  },
  itemInfo: {
    flex: 1,
    marginEnd: spacing.spacer8,
  },
  itemName: {
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    textAlign: 'right',
  },
  tierInfo: {
    fontSize: 10,
    textAlign: 'right',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginEnd: spacing.spacer8,
  },
  quantityButton: {
    width: spacing.spacer24,
    height: spacing.spacer24,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantity: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    marginHorizontal: spacing.spacer8,
    minWidth: spacing.spacer20,
    textAlign: 'center',
  },
  removeButton: {
    width: spacing.spacer24,
    height: spacing.spacer24,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  footer: {
    padding: spacing.spacer12,
    borderTopWidth: 1,
  },
  checkoutButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: typography.md.fontSize,
    fontWeight: '600',
  },
});
