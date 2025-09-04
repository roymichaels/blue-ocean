import { errorLog } from '@/utils/logger';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import SmartImage from '@/components/SmartImage';
import { Heart, Pencil, ShoppingCart, Tag } from 'lucide-react-native';
import { useAppRouter } from '@/services';
import { Product, PricingTier } from '@/types';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import CartService from '../../cart/services/cart';
import DatabaseService from '@/services/database';
import MediaService from '@/services/media';
import { useAccountId } from '../../auth/services/nearAuth';
import productsAgent from '@/agents/products-agent';
import Card from '@/ui/primitives/Card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;
const IMAGE_HEIGHT = 140;
interface ProductCardProps {
  product: Product;
  isOwner?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;

  subcategoryName?: string;

  style?: any;
}

function ProductCard({
  product,
  isOwner = false,
  onEdit,
  onDelete,

  subcategoryName,

  style
}: ProductCardProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [pricingTier, setPricingTier] = useState<PricingTier | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [summary, setSummary] = useState({ rating: product.rating, reviews: product.reviews });
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const address = useAccountId();
  const { push } = useAppRouter();
  const variants = useMemo(() => product.variants || [], [product.variants]);
  const selectedVariant = useMemo(() => variants[selectedVariantIndex], [variants, selectedVariantIndex]);
  const stock = useMemo(() => (selectedVariant ? selectedVariant.stock : product.stock), [selectedVariant, product.stock]);
  const hideCard = useMemo(
    () => isOwner && address && product.storeId !== address,
    [isOwner, address, product.storeId]
  );

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
    let active = true;
    productsAgent.getSummary(product.id).then((s) => {
      if (active) setSummary(s);
    });
    return () => {
      active = false;
    };
  }, [product.id]);

  useEffect(() => {
    const loadThumb = async () => {
      if ((!product.images || product.images.length === 0) && product.videos && product.videos.length > 0) {
        try {
          const svc = MediaService.getInstance();
          const thumb = await svc.generateVideoThumbnail(product.videos[0]);
          if (thumb) setVideoThumbnail(thumb);
        } catch (err) {
          errorLog('Error generating video thumbnail:', err);
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
      errorLog('Error loading pricing tier:', error);
    }
  };

  const handlePress = useCallback(() => {
    push(`/product/${product.id}`);
  }, [product.id, push]);

  const handleEdit = useCallback(
    (e: any) => {
      e.stopPropagation();
      onEdit?.(product);
    },
    [onEdit, product]
  );

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
    if (stock === 0) return;

    const cartService = CartService.getInstance();
    await cartService.addToCart(product, 1);
    Alert.alert('נוסף לעגלה', `${product.name} נוסף לעגלה`);
  };

  // Check if product has tiered pricing with price per unit
  const hasTieredPricing = pricingTier && pricingTier.pricePerUnit !== undefined;

  if (hideCard) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
        },
        style,
      ]}
      onPress={handlePress}
    >
      <Card style={{ padding: 0, backgroundColor: 'transparent' }}>
        <View style={styles.imageContainer}>
        {product.images && product.images.length > 0 ? (
          <SmartImage uri={product.images[0]} width={CARD_WIDTH} height={IMAGE_HEIGHT} contentFit="cover" />
        ) : product.videos && product.videos.length > 0 ? (
          videoThumbnail ? (
            <SmartImage uri={videoThumbnail} width={CARD_WIDTH} height={IMAGE_HEIGHT} contentFit="cover" />
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
            stock === 0 && { backgroundColor: colors.interactive.disabled }
          ]}
          onPress={addToCart}
          disabled={stock === 0}
        >
          <ShoppingCart size={16} color={colors.text.inverse} />
        </TouchableOpacity>

        {/* Owner Actions */}
        {isOwner && (
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
          <Text style={[styles.rating, { color: colors.text.primary }]}>⭐ {summary.rating.toFixed(1)}</Text>
          <Text style={[styles.reviews, { color: colors.text.tertiary }]}>({summary.reviews})</Text>
        </View>

        {/* Variant Colors */}
        {variants.length > 0 && (
          <>
            <View style={styles.variantContainer}>
              {variants.map((v, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedVariantIndex(idx);
                  }}
                  style={[
                    styles.variantDot,
                    { backgroundColor: v.color, borderColor: colors.border.primary },
                    idx === selectedVariantIndex && { borderColor: colors.gold, borderWidth: 2 },
                  ]}
                />
              ))}
            </View>
            {selectedVariant && (
              <Text style={[styles.selectedVariantText, { color: colors.text.secondary }]}>צבע: {selectedVariant.color}</Text>
            )}
          </>
        )}

        {/* Stock Status */}
        <View style={styles.stockContainer}>
          <View
            style={[
              styles.stockIndicator,
              { backgroundColor: stock > 0 ? colors.status.success : colors.status.error },
            ]}
          />
          <Text style={[styles.stockText, { color: colors.text.secondary }]}> 
            {stock > 0 ? `במלאי (${stock})` : 'אזל מהמלאי'}
          </Text>
        </View>
        </View>
      </Card>
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
    height: IMAGE_HEIGHT,
    width: CARD_WIDTH,
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
    start: 8,
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
    end: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    position: 'absolute',
    top: 8,
    end: 8,
    flexDirection: 'row',
  },
  adminButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    start: 8,
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
  variantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  variantDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 1,
  },
  selectedVariantText: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
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

export default React.memo(ProductCard);
