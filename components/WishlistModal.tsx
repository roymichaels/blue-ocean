import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { X, Heart, ShoppingCart, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import CartService from '../services/cart';
import { WishlistItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface WishlistModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WishlistModal({ visible, onClose }: WishlistModalProps) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  useEffect(() => {
    if (visible) {
      loadWishlistItems();
    }
  }, [visible]);

  useEffect(() => {
    const cartService = CartService.getInstance();
    const handleWishlistUpdate = () => {
      setWishlistItems(cartService.getWishlistItems());
    };

    cartService.addListener(handleWishlistUpdate);
    return () => cartService.removeListener(handleWishlistUpdate);
  }, []);

  const loadWishlistItems = () => {
    const cartService = CartService.getInstance();
    setWishlistItems(cartService.getWishlistItems());
  };

  const removeFromWishlist = async (productId: string) => {
    const cartService = CartService.getInstance();
    await cartService.removeFromWishlist(productId);
  };

  const addToCart = async (item: WishlistItem) => {
    const cartService = CartService.getInstance();
    await cartService.addToCart(item.product, 1);
    Alert.alert('נוסף לעגלה', `${item.product.name} נוסף לעגלה`);
  };

  const viewProduct = (productId: string) => {
    onClose();
    router.push(`/product/${productId}`);
  };

  const renderWishlistItem = (item: WishlistItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.wishlistItem, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      }]}
      onPress={() => viewProduct(item.productId)}
    >
      <Image source={{ uri: item.product.images[0] }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={2}>
          {item.product.name}
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={[styles.currentPrice, { color: colors.gold }]}>{currencySymbol}{item.product.price.toFixed(2)}</Text>
          {item.product.originalPrice && (
            <Text style={[styles.originalPrice, { color: colors.text.tertiary }]}>{currencySymbol}{item.product.originalPrice.toFixed(2)}</Text>
          )}
        </View>

        <View style={styles.ratingContainer}>
          <Text style={[styles.rating, { color: colors.text.primary }]}>⭐ {item.product.rating}</Text>
          <Text style={[styles.reviews, { color: colors.text.tertiary }]}>({item.product.reviews})</Text>
        </View>

        <View style={styles.stockContainer}>
          <View style={[
            styles.stockIndicator,
            { backgroundColor: item.product.stock > 0 ? colors.status.success : colors.status.error }
          ]} />
          <Text style={[styles.stockText, { color: colors.text.secondary }]}>
            {item.product.stock > 0 ? `במלאי (${item.product.stock})` : 'אזל מהמלאי'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.addToCartButton, { backgroundColor: colors.gold }]}
          onPress={() => addToCart(item)}
          disabled={item.product.stock === 0}
        >
          <ShoppingCart size={16} color={colors.text.inverse} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton, { backgroundColor: colors.status.error }]}
          onPress={() => removeFromWishlist(item.productId)}
        >
          <Trash2 size={16} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { 
          borderBottomColor: colors.border.primary 
        }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>רשימת המשאלות</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {wishlistItems.length > 0 ? (
          <ScrollView style={styles.wishlistList} showsVerticalScrollIndicator={false}>
            {wishlistItems.map(renderWishlistItem)}
          </ScrollView>
        ) : (
          <View style={styles.emptyWishlist}>
            <Heart size={80} color={colors.interactive.disabled} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>רשימת המשאלות ריקה</Text>
            <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>הוסף מוצרים לרשימת המשאלות כדי לשמור אותם למועד מאוחר יותר</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  wishlistList: {
    flex: 1,
    padding: 16,
  },
  wishlistItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviews: {
    fontSize: 12,
    marginLeft: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stockIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButton: {},
  removeButton: {},
  emptyWishlist: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});