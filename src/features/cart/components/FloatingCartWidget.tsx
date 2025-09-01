import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import SmartImage from '@/components/SmartImage';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { router } from 'expo-router';
import useCart from '../hooks/useCart';

const { width } = Dimensions.get('window');

export default function FloatingCartWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(60));
  const [animatedOpacity] = useState(new Animated.Value(0));
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const { t } = useLanguage();
  const isRTL = I18nManager.isRTL;
  const { cartItems, updateQuantity, removeItem, getTotal, getTotalItems } = useCart();

  useEffect(() => {
    if (cartItems.length > 0) {
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setIsExpanded(false);
    }
  }, [cartItems.length, animatedOpacity]);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    Animated.timing(animatedHeight, {
      toValue: newExpanded ? Math.min(300, cartItems.length * 80 + 120) : 60,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

    const goToCheckout = () => {
      setIsExpanded(false);
      router.push({ pathname: '/(tabs)', params: { showCart: 'true' } });
    };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animatedOpacity,
          height: animatedHeight,
          backgroundColor: colors.surface.elevated,
          borderColor: colors.border.primary,
          ...Platform.select({
            ios: { elevation: 12 },
            android: { elevation: 12 },
            web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
          }),
        }
      ]}
    >
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <View style={[styles.cartIcon, { backgroundColor: colors.gold }]}>
            <ShoppingCart
              size={20}
              color={colors.text.inverse}
              style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
            />
            <View style={[styles.itemCount, { backgroundColor: colors.status.error }]}>
              <Text style={[styles.itemCountText, { color: colors.text.primary }]}>{getTotalItems()}</Text>
            </View>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {t('cart.cartTitle')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.gold }]} numberOfLines={1}>
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.productPreview, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {cartItems.slice(0, 3).map((item, index) => (
              <SmartImage
                key={item.id}
                uri={item.product.images[0]}
                width={32}
                height={32}
                style={[
                  styles.previewImage,
                  {
                    marginStart: index > 0 ? -8 : 0,
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
                    marginStart: -8,
                    borderColor: colors.background,
                    backgroundColor: colors.interactive.disabled,
                  }
                ]}
              >
                <Text style={[styles.moreItemsText, { color: colors.text.inverse }]}>+{cartItems.length - 3}</Text>
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
                  width={40}
                  height={40}
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
                      <Text style={[styles.tierInfo, { color: colors.text.secondary }]}>{'\n'}
                      {item.tierName} • EQ {item.effectiveQty}
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
                    <Minus size={12} color={colors.text.primary} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.quantity, { color: colors.text.primary }]}>{item.quantity}</Text>
                  
                  <TouchableOpacity
                    style={[styles.quantityButton, { 
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary 
                    }]}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus size={12} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.removeButton, { 
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.border.primary 
                  }]}
                  onPress={() => removeItem(item.id)}
                >
                  <X size={12} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
            <TouchableOpacity style={[styles.checkoutButton, { backgroundColor: colors.gold }]} onPress={goToCheckout}>
              <Text style={[styles.checkoutButtonText, { color: colors.text.inverse }]}>
                {t('cart.proceedToPaymentTotal', {
                  total: `${currencySymbol}${getTotal().toFixed(2)}`,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 170,
    start: 16,
    end: 16,
    borderRadius: 16,
    zIndex: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    height: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartIcon: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 12,
  },
  itemCount: {
    position: 'absolute',
    top: -4,
    end: -4,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  itemCountText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'end',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'end',
  },
  headerRight: {
    marginStart: 12,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    borderRadius: 16,
    borderWidth: 2,
  },
  moreItems: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    maxHeight: 200,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  itemImage: {
    borderRadius: 8,
    marginEnd: 12,
  },
  itemInfo: {
    flex: 1,
    marginEnd: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'end',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'end',
  },
  tierInfo: {
    fontSize: 10,
    textAlign: 'end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginEnd: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
  },
  checkoutButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
