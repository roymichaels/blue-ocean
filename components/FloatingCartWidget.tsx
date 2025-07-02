import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react-native';
import CartService from '../services/cart';
import { CartItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function FloatingCartWidget() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(60));
  const [animatedOpacity] = useState(new Animated.Value(0));
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  useEffect(() => {
    const cartService = CartService.getInstance();
    
    const updateCart = () => {
      const items = cartService.getCartItems();
      setCartItems(items);
      
      // Show/hide widget based on cart content
      if (items.length > 0) {
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
    };

    updateCart();
    cartService.addListener(updateCart);
    
    return () => cartService.removeListener(updateCart);
  }, []);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    Animated.timing(animatedHeight, {
      toValue: newExpanded ? Math.min(300, cartItems.length * 80 + 120) : 60,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    const cartService = CartService.getInstance();
    await cartService.updateCartItemQuantity(itemId, newQuantity);
  };

  const removeItem = async (itemId: string) => {
    const cartService = CartService.getInstance();
    await cartService.removeFromCart(itemId);
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.unitPrice ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const goToCheckout = () => {
    setIsExpanded(false);
    router.push({
      pathname: '/(tabs)/',
      params: { showCart: 'true' }
    });
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
            ios: {
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 12,
            },
            web: {
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)'
            }
          }),
        }
      ]}
    >
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <View style={[styles.cartIcon, { backgroundColor: colors.gold }]}>
            <ShoppingCart size={20} color={colors.text.inverse} />
            <View style={[styles.itemCount, { backgroundColor: colors.status.error }]}>
              <Text style={[styles.itemCountText, { color: colors.text.primary }]}>{getTotalItems()}</Text>
            </View>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>עגלת קניות</Text>
            <Text style={[styles.headerSubtitle, { color: colors.gold }]}>{currencySymbol}{getTotal().toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.productPreview}>
            {cartItems.slice(0, 3).map((item, index) => (
              <Image
                key={item.id}
                source={{ uri: item.product.images[0] }}
                style={[
                  styles.previewImage,
                  { 
                    marginLeft: index > 0 ? -8 : 0,
                    zIndex: 3 - index,
                    borderColor: colors.background,
                  }
                ]}
              />
            ))}
            {cartItems.length > 3 && (
              <View style={[styles.moreItems, { 
                marginLeft: -8,
                borderColor: colors.background,
                backgroundColor: colors.interactive.disabled
              }]}>
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
                <Image 
                  source={{ uri: item.product.images[0] }} 
                  style={styles.itemImage} 
                />
                
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.gold }]}>
                    {currencySymbol}{(item.unitPrice ?? item.product.price).toFixed(2)}
                  </Text>
                  {item.tierName && (
                    <Text style={[styles.tierInfo, { color: colors.text.secondary }]}>\n                      {item.tierName} • EQ {item.effectiveQty}
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
                המשך לתשלום • {currencySymbol}{getTotal().toFixed(2)}
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
    bottom: 100,
    left: 16,
    right: 16,
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
    marginRight: 12,
  },
  itemCount: {
    position: 'absolute',
    top: -4,
    right: -4,
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
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  headerRight: {
    marginLeft: 12,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: 32,
    height: 32,
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
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 12,
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
    marginRight: 8,
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