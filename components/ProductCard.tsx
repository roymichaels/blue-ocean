import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Heart, Pencil, ShoppingCart, Tag } from 'lucide-react-native';
import { router } from 'expo-router';
import { Product, PricingTier } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import CartService from '../services/cart';
import DatabaseService from '../services/database';
import MediaService from '../services/media';

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;

  subcategoryName?: string;

  style?: any;
}

export default function ProductCard({
  product,
  isAdmin = false,
  onEdit,
  onDelete,

  subcategoryName,

  style
}: ProductCardProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [pricingTier, setPricingTier] = useState<PricingTier | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  useEffect(() => {
    const cartService = CartService.getInstance();
    setIsInWishlist(cartService.isInWishlist(product.id));

    const handleUpdate = () => {
      setIsInWishlist(cartService.isInWishlist(product.id));
    };

    cartService.addListener(handleUpdate);
    
    // Load pricing tier if product has one
    if (product.pricingTier) {
      loadPricingTier(product.pricingTier);
    }
    
    return () => cartService.removeListener(handleUpdate);
  }, [product.id, product.pricingTier]);

  useEffect(() => {
    const loadThumb = async () => {
      if ((!product.images || product.images.length === 0) && product.videos && product.videos.length > 0) {
        try {
          const svc = MediaService.getInstance();
          const thumb = await svc.generateVideoThumbnail(product.videos[0]);
          if (thumb) setVideoThumbnail(thumb);
        } catch (err) {
          console.error('Error generating video thumbnail:', err);
        }
      }
    };
    loadThumb();
  }, [product.images, product.videos]);

  const loadPricingTier = async (tierId: string) => {
    try {
      const db = DatabaseService.getInstance();
      const tier = await db.getPricingTier(tierId);
      if (tier) {
        setPricingTier(tier);
      }
    } catch (error) {
      console.error('Error loading pricing tier:', error);
    }
  };

  const handlePress = () => {
    router.push(`/product/${product.id}`);
  };

  const handleEdit = (e: any) => {
    e.stopPropagation();
    onEdit?.(product);
  };

  const handleDelete = (e: any) => {
    e.stopPropagation();
    onDelete?.(product.id);
  };

  const toggleWishlist = async (e: any) => {
    e.stopPropagation();
    const cartService = CartService.getInstance();
    
    if (isInWishlist) {
      await cartService.removeFromWishlist(product.id);
    } else {
      await cartService.addToWishlist(product);
    }
  };

  const addToCart = async (e: any) => {
    e.stopPropagation();
    if (product.stock === 0) return;
    
    const cartService = CartService.getInstance();
    await cartService.addToCart(product, 1);
    Alert.alert('נוסף לעגלה', `${product.name} נוסף לעגלה`);
  };

  // Check if product has tiered pricing with price per unit
  const hasTieredPricing = pricingTier && pricingTier.pricePerUnit !== undefined;

  return (
    <TouchableOpacity style={[
      styles.container,
      { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      },
      style,
      Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
        }
      }),
    ]} onPress={handlePress}>
      <View style={styles.imageContainer}>
        {product.images && product.images.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
        ) : product.videos && product.videos.length > 0 ? (
          videoThumbnail ? (
            <Image source={{ uri: videoThumbnail }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>אין תמונה</Text>
            </View>
          )
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>אין תמונה</Text>
          </View>
        )}
        
        {/* Favorite Button */}
        <TouchableOpacity 
          style={[
            styles.favoriteButton,
            isInWishlist && { backgroundColor: 'rgba(255, 59, 48, 0.3)' }
          ]} 
          onPress={toggleWishlist}
        >
          <Heart 
            size={16} 
            color={isInWishlist ? colors.status.error : "#FFFFFF"}
            fill={isInWishlist ? colors.status.error : 'transparent'}
          />
        </TouchableOpacity>

        {/* Quick Add to Cart */}
        <TouchableOpacity 
          style={[
            styles.cartButton,
            { backgroundColor: colors.gold },
            product.stock === 0 && { backgroundColor: colors.interactive.disabled }
          ]} 
          onPress={addToCart}
          disabled={product.stock === 0}
        >
          <ShoppingCart size={16} color={colors.text.inverse} />
        </TouchableOpacity>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity style={styles.adminButton} onPress={handleEdit}>
              <Pencil size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesContainer}>
          {product.badges && product.badges.length > 0 && (
            product.badges.slice(0, 2).map((badge, index) => (
              <View key={index} style={[styles.badge, { backgroundColor: colors.gold }]}>
                <Text style={[styles.badgeText, { color: colors.text.inverse }]}>{badge}</Text>
              </View>
            ))
          )}
          
          {/* Tiered Pricing Badge */}
          {hasTieredPricing && (
            <View style={[styles.badge, { backgroundColor: colors.status.info }]}>
              <Text style={[styles.badgeText, { color: colors.text.inverse }]}>מחיר מדורג</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Product Name */}
        <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={[styles.currentPrice, { color: colors.gold }]}>{currencySymbol}{product.price.toFixed(2)}</Text>
          {product.originalPrice && (
            <Text style={[styles.originalPrice, { color: colors.text.tertiary }]}>{currencySymbol}{product.originalPrice.toFixed(2)}</Text>
          )}
        </View>


        {/* Subcategory */}
        {subcategoryName && (
          <View style={styles.tieredPricingContainer}>
            <Tag size={12} color={colors.status.info} />
            <Text style={[styles.tieredPricingText, { color: colors.status.info }]}> {subcategoryName} </Text>

          </View>
        )}

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={[styles.rating, { color: colors.text.primary }]}>⭐ {product.rating}</Text>
          <Text style={[styles.reviews, { color: colors.text.tertiary }]}>({product.reviews})</Text>
        </View>

        {/* Stock Status */}
        <View style={styles.stockContainer}>
          <View style={[
            styles.stockIndicator,
            { backgroundColor: product.stock > 0 ? colors.status.success : colors.status.error }
          ]} />
          <Text style={[styles.stockText, { color: colors.text.secondary }]}>
            {product.stock > 0 ? `במלאי (${product.stock})` : 'אזל מהמלאי'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: 14,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
  },
  adminButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgesContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '70%',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18,
    textAlign: 'right',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
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
  tieredPricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  tieredPricingText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
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
    fontSize: 11,
    fontWeight: '500',
  },
});
