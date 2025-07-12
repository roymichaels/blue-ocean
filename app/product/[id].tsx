import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Share2,
  Star,
  Pencil,
  X,
  Image as ImageIcon,
} from 'lucide-react-native';
import DatabaseService from '../../services/database';
import CartService from '../../services/cart';
import { Product, Category, PricingTier, HeroBanner } from '../../types';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import FullScreenMediaViewer from '../../components/FullScreenMediaViewer';
import InfoModal from '../../components/InfoModal';
import ProductFormModal from '../../components/ProductFormModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import MediaService from '../../services/media';



interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
  thumbnail?: string;
}

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAdmin } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const [categoryBanner, setCategoryBanner] = useState<HeroBanner | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    loadProduct();
    loadCategories();
    loadPricingTiers();
  }, [id]);

  useEffect(() => {
    if (product) {
      const cartService = CartService.getInstance();
      setIsFavorite(cartService.isInWishlist(product.id));

      const handleUpdate = () => {
        setIsFavorite(cartService.isInWishlist(product.id));
      };

      cartService.addListener(handleUpdate);
      return () => cartService.removeListener(handleUpdate);
    }
  }, [product]);

  useEffect(() => {
    const fetchBanner = async () => {
      if (!product) return;
      try {
        const db = DatabaseService.getInstance();
        const banners = await db.getHeroBanners();
        const matched = banners.find((b) => b.category === product.category);
        setCategoryBanner(matched || null);
      } catch (error) {
        console.error('Error loading hero banner:', error);
      }
    };

    fetchBanner();
  }, [product]);

  useEffect(() => {
    const loadThumbs = async () => {
      if (!product?.videos) return;
      const svc = MediaService.getInstance();
      for (let i = 0; i < product.videos.length; i++) {
        const id = `video_${i}`;
        if (!videoThumbnails[id]) {
          try {
            const thumb = await svc.generateVideoThumbnail(product.videos[i]);
            if (thumb) {
              setVideoThumbnails((prev) => ({ ...prev, [id]: thumb }));
            }
          } catch (err) {
            console.error('Error generating video thumbnail:', err);
          }
        }
      }
    };
    loadThumbs();
  }, [product]);

  const loadProduct = async () => {
    try {
      const db = DatabaseService.getInstance();
      const fetched = await db.getProduct(id);
      setProduct(fetched);
    } catch (error) {
      console.error('Error loading product:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת המוצר נכשלה',
        type: 'error',
      });
    }
  };

  const loadCategories = async () => {
    try {
      const db = DatabaseService.getInstance();
      const categoriesData = await db.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPricingTiers = async () => {
    try {
      const db = DatabaseService.getInstance();
      const tiersData = await db.getPricingTiers();
      setPricingTiers(tiersData);
    } catch (error) {
      console.error('Error loading pricing tiers:', error);
    }
  };

  const getAllMedia = () => {
    if (!product) return [];
    const media: MediaItem[] = [];

    // Add images
    product.images?.forEach((uri, index) => {
      media.push({
        id: `image_${index}`,
        uri,
        type: 'image',
        name: `Image ${index + 1}`,
      });
    });

    // Add videos
    product.videos?.forEach((uri, index) => {
      media.push({
        id: `video_${index}`,
        uri,
        type: 'video',
        name: `Video ${index + 1}`,
      });
    });

    return media;
  };

  const openMediaViewer = (index: number) => {
    setSelectedMediaIndex(index);
    setMediaViewerVisible(true);
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const toggleFavorite = async () => {
    if (!product) return;

    const cartService = CartService.getInstance();
    if (isFavorite) {
      await cartService.removeFromWishlist(product.id);
    } else {
      await cartService.addToWishlist(product);
    }
  };

  const shareProduct = () => {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        navigator
          .share({
            title: product?.name || 'Check out this product',
            text: product?.description || 'I found this amazing product',
            url: window.location.href,
          })
          .catch((error) => {
            console.error('Error sharing:', error);
          });
      } else {
        setInfoModal({
          visible: true,
          title: 'שיתוף',
          message: 'שיתוף אינו נתמך בדפדפן זה',
          type: 'info',
        });
      }
    } else {
      setInfoModal({
        visible: true,
        title: 'שיתוף',
        message: 'פונקציונליות השיתוף תתווסף בקרוב',
        type: 'info',
      });
    }
  };

  const addToCart = async () => {
    if (!product) return;

    const cartService = CartService.getInstance();
    await cartService.addToCart(product, quantity);
    setInfoModal({
      visible: true,
      title: 'נוסף לעגלה',
      message: `${product.name} נוסף לעגלה בכמות ${quantity}`,
      type: 'success',
    });
  };

  const buyNow = async () => {
    await addToCart();
    // Navigate to cart or checkout
    router.push({
      pathname: '/(tabs)',
      params: { showCart: 'true' },
    });
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const handleProductSaved = (p: Product) => {
    setProduct(p);
  };

  const handleProductDeleted = (id: string) => {
    router.back();
  };

  // Calculate effective price based on pricing tier and quantity
  const getEffectivePrice = (basePrice: number, quantity: number): number => {
    if (!product?.pricingTier) return basePrice;

    const tier = pricingTiers.find((t) => t.id === product.pricingTier);
    if (!tier) return basePrice;

    // If quantity meets minimum requirement and tier has a price per unit
    if (quantity >= tier.minQuantity && typeof tier.pricePerUnit === 'number') {
      return tier.pricePerUnit;
    }

    return basePrice;
  };

  // Calculate total price based on quantity and pricing tier
  const getTotalPrice = (): number => {
    if (!product) return 0;

    const effectivePrice = getEffectivePrice(product.price, quantity);
    return effectivePrice * quantity;
  };

  if (!product) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.border.primary }]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            טוען...
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const allMedia = getAllMedia();
  const bannerImageUri =
    categoryBanner?.image ||
    product.images?.[0] ||
    videoThumbnails['video_0'];
  const currentPricingTier = pricingTiers.find(
    (tier) => tier.id === product.pricingTier
  );
  const effectivePrice = getEffectivePrice(product.price, quantity);
  const showTieredPricing =
    currentPricingTier &&
    typeof currentPricingTier.pricePerUnit === 'number' &&
    quantity >= currentPricingTier.minQuantity;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={shareProduct}
            >
              <Share2 size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
                isFavorite && styles.favoriteActive,
              ]}
              onPress={toggleFavorite}
            >
              <Heart
                size={24}
                color={isFavorite ? colors.status.error : colors.text.primary}
                fill={isFavorite ? colors.status.error : 'transparent'}
              />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: colors.surface.primary,
                    borderColor: colors.border.primary,
                  },
                ]}
                onPress={openEditModal}
              >
                <Pencil size={24} color={colors.gold} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ——— Product Media Carousel ——— */}
        {allMedia.length > 0 && (
          <View style={styles.galleryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContent}
            >
              {allMedia.map((media, idx) => (
                <TouchableOpacity
                  key={media.id}
                  style={[
                    styles.galleryItem,
                    { borderColor: colors.border.primary },
                  ]}
                  onPress={() => openMediaViewer(idx)}
                >
                  <Image
                    source={{ uri: media.type === 'video' ? videoThumbnails[media.id] || media.uri : media.uri }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                  {media.type === 'video' && (
                    <View style={styles.videoIndicator}>
                      <Text
                        style={[
                          styles.videoIndicatorText,
                          { color: colors.text.inverse },
                        ]}
                      >
                        ▶
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Badges */}
          {product.badges && product.badges.length > 0 && (
            <View style={styles.badgesContainer}>
              {product.badges.map((badge, index) => (
                <View
                  key={index}
                  style={[styles.badge, { backgroundColor: colors.gold }]}
                >
                  <Text
                    style={[styles.badgeText, { color: colors.text.inverse }]}
                  >
                    {badge}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={[styles.currentPrice, { color: colors.gold }]}>
              {currencySymbol}
              {product.price.toFixed(2)}
            </Text>
            {product.originalPrice && (
              <Text
                style={[styles.originalPrice, { color: colors.text.tertiary }]}
              >
                {currencySymbol}
                {product.originalPrice.toFixed(2)}
              </Text>
            )}
            {product.originalPrice && (
              <View
                style={[
                  styles.discountBadge,
                  { backgroundColor: colors.status.error },
                ]}
              >
                <Text
                  style={[styles.discountText, { color: colors.text.primary }]}
                >
                  {Math.round(
                    ((product.originalPrice - product.price) /
                      product.originalPrice) *
                      100
                  )}
                  % הנחה
                </Text>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  color={
                    star <= Math.floor(product.rating)
                      ? colors.gold
                      : colors.interactive.disabled
                  }
                  fill={
                    star <= Math.floor(product.rating)
                      ? colors.gold
                      : 'transparent'
                  }
                />
              ))}
              <Text
                style={[styles.ratingText, { color: colors.text.secondary }]}
              >
                {product.rating} ({product.reviews} ביקורות)
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {product.name}
          </Text>

          {/* Pricing Tier */}
          {currentPricingTier && (
            <View style={styles.pricingTierContainer}>
              <Text style={[styles.pricingTierText, { color: colors.gold }]}>
                {currentPricingTier.name}
                {typeof currentPricingTier.pricePerUnit === 'number' &&
                  ` - מחיר ליחידה: ${currencySymbol}${currentPricingTier.pricePerUnit.toFixed(
                    2
                  )}`}
              </Text>
              {currentPricingTier.minQuantity > 1 && (
                <Text
                  style={[
                    styles.pricingTierMinQuantity,
                    { color: colors.text.secondary },
                  ]}
                >
                  (מינימום {currentPricingTier.minQuantity} יחידות)
                </Text>
              )}
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            <Text
              style={[
                styles.stockText,
                {
                  color:
                    product.stock > 0
                      ? colors.status.success
                      : colors.status.error,
                },
              ]}
            >
              {product.stock > 0
                ? `במלאי (${product.stock} יחידות)`
                : 'אזל מהמלאי'}
            </Text>
          </View>

          {/* Media Gallery */}
          {allMedia.length > 1 && (
            <View style={styles.galleryContainer}>
              <Text
                style={[styles.galleryTitle, { color: colors.text.primary }]}
              >
                גלריית מדיה
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryContent}
              >
                {allMedia.map((media, index) => (
                  <TouchableOpacity
                    key={media.id}
                    style={[
                      styles.galleryItem,
                      { borderColor: colors.border.primary },
                    ]}
                    onPress={() => openMediaViewer(index)}
                  >
                    <Image
                      source={{ uri: media.type === 'video' ? videoThumbnails[media.id] || media.uri : media.uri }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                    {media.type === 'video' && (
                      <View style={styles.videoIndicator}>
                        <Text
                          style={[
                            styles.videoIndicatorText,
                            { color: colors.text.inverse },
                          ]}
                        >
                          ▶
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          <Text style={[styles.description, { color: colors.text.secondary }]}>
            {product.description}
          </Text>

          {/* Tiered Pricing Info */}
          {showTieredPricing && (
            <View
              style={[
                styles.tieredPricingInfo,
                {
                  backgroundColor: colors.interactive.secondary,
                  borderColor: colors.gold,
                },
              ]}
            >
              <Text
                style={[
                  styles.tieredPricingTitle,
                  { color: colors.text.primary },
                ]}
              >
                מחיר מדורג פעיל!
              </Text>
              <Text
                style={[
                  styles.tieredPricingText,
                  { color: colors.text.secondary },
                ]}
              >
                {`מחיר ליחידה: ${currencySymbol}${effectivePrice.toFixed(
                  2
                )} (במקום ${currencySymbol}${product.price.toFixed(2)})`}
              </Text>
              <Text style={[styles.tieredPricingTotal, { color: colors.gold }]}>
                {`סה"כ: ${currencySymbol}${getTotalPrice().toFixed(2)}`}
              </Text>
            </View>
          )}

          {/* Quantity Selection */}
          {product.stock > 0 && (
            <View style={styles.quantitySection}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                כמות
              </Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary,
                    },
                    quantity === 1 && {
                      backgroundColor: colors.interactive.disabled,
                    },
                  ]}
                  onPress={decrementQuantity}
                  disabled={quantity === 1}
                >
                  <Minus
                    size={20}
                    color={
                      quantity === 1
                        ? colors.interactive.disabled
                        : colors.text.primary
                    }
                  />
                </TouchableOpacity>
                <Text
                  style={[styles.quantityText, { color: colors.text.primary }]}
                >
                  {quantity}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary,
                    },
                    quantity >= product.stock && {
                      backgroundColor: colors.interactive.disabled,
                    },
                  ]}
                  onPress={incrementQuantity}
                  disabled={quantity >= product.stock}
                >
                  <Plus
                    size={20}
                    color={
                      quantity >= product.stock
                        ? colors.interactive.disabled
                        : colors.text.primary
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View
        style={[
          styles.bottomActions,
          {
            borderTopColor: colors.border.primary,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.buyNowButton,
            { borderColor: colors.gold },
            product.stock === 0 && styles.buttonDisabled,
          ]}
          onPress={buyNow}
          disabled={product.stock === 0}
        >
          <Text style={[styles.buyNowText, { color: colors.gold }]}>
            קנה עכשיו
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            { backgroundColor: colors.gold },
            product.stock === 0 && styles.buttonDisabled,
          ]}
          onPress={addToCart}
          disabled={product.stock === 0}
        >
          <ShoppingCart size={20} color={colors.text.inverse} />
          <Text style={[styles.addToCartText, { color: colors.text.inverse }]}>
            הוסף לעגלה
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full Screen Media Viewer */}
      <FullScreenMediaViewer
        visible={mediaViewerVisible}
        media={allMedia}
        initialIndex={selectedMediaIndex}
        onClose={() => setMediaViewerVisible(false)}
      />

      <ProductFormModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        product={product || undefined}
        onSaved={handleProductSaved}
        onDeleted={handleProductDeleted}
      />

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />
    </SafeAreaView>
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
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  favoriteActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  heroBanner: {
    width: '100%',
    height: 180,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 13, 10, 0.4)',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  heroDiscount: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right',
  },
  coverImageContainer: {
    width: '100%',
    height: 300,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 12,
    fontSize: 16,
  },
  galleryContainer: {
    marginVertical: 16,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  galleryContent: {
    paddingRight: 16,
  },
  galleryItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 8,
    position: 'relative',
    borderWidth: 1,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicatorText: {
    fontSize: 24,
  },
  productInfo: {
    padding: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginRight: 8,
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  pricingTierContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  pricingTierText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pricingTierMinQuantity: {
    fontSize: 12,
    marginTop: 2,
  },
  stockContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  tieredPricingInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  tieredPricingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  tieredPricingText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'right',
  },
  tieredPricingTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  buyNowButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 25,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  buyNowText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addToCartButton: {
    flex: 1,
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  categorySelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categorySelectorText: {
    fontSize: 16,
    textAlign: 'right',
  },
  categorySelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  categorySelectorContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  categorySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categorySelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categorySelectorList: {
    maxHeight: 400,
  },
  categorySelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  categorySelectorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySelectorItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categorySelectorItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categorySelectorItemId: {
    fontSize: 12,
  },
  pricingTierInfo: {
    marginLeft: 12,
    flex: 1,
    alignItems: 'flex-end',
  },
  pricingTierDiscount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pricingTierDescription: {
    fontSize: 12,
    textAlign: 'right',
  },
});
