import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppRouter from 'hooks/useAppRouter';
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
  MessageCircle,
  Shield,
} from 'lucide-react-native';
import CartService from '@/features/cart/services/cart';
import { Product } from '../../types';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '../../contexts/CurrencyContext';
import FullScreenMediaViewer from '../../components/FullScreenMediaViewer';
import InfoModal from '../../components/InfoModal';
import ProductFormModal from '@/features/products/components/ProductFormModal';
import { Spinner } from '@/ui/primitives';
import { useAccountId } from '@/features/auth/services/nearAuth';
import chatAgent from '../../agents/chat-agent';
import moderationAgent from '../../agents/moderation-agent';
import commonStyles from '@/constants/styles';
import GlobalHeader from '../../components/GlobalHeader';
import FloatingCartWidget from '@/features/cart/components/FloatingCartWidget';
import SmartImage from '../../components/SmartImage';
import eventBus from '@/services/eventBus';
import { useProduct } from '@/features/products/hooks';
import useCategories from 'hooks/useCategories';
import { useProductPricing } from '@/services/useProductPricing';
import useReviews from 'hooks/useReviews';
import useVideoThumbnails from 'hooks/useVideoThumbnails';



interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
  thumbnail?: string;
}

const { width } = Dimensions.get('window');
const COVER_SIZE = Math.min(width, 540);

export default function ProductDetailScreen({ id }: { id: string }) {
  const { push, back } = useAppRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const categories = useCategories();
  const [quantity, setQuantity] = useState(1);
  const { effectivePrice, totalPrice, currentPricingTier, showTieredPricing } =
    useProductPricing(product, quantity);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { isStoreOwner } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const videoThumbnails = useVideoThumbnails(product?.videos);
  const address = useAccountId();
  const reviews = useReviews(id);
  const { data: fetchedProduct, isLoading: productLoading } = useProduct(id);

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  useEffect(() => {
    if (productLoading) return;
    if (address && fetchedProduct && fetchedProduct.storeId !== address) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'מוצר לא נמצא',
        type: 'error',
      });
      setProduct(null);
      return;
    }
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      eventBus.track('catalog.product_view', { productId: fetchedProduct.id });
    }
  }, [fetchedProduct, productLoading, address]);

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
            errorLog('Error sharing:', error);
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
    push({
      pathname: '/',
      params: { showCart: 'true' },
    });
  };

  const handleMessageSeller = async () => {
    if (!product) return;
    const buyer = address || 'guest_user';
    await chatAgent.openChat(buyer, product.storeId, product.storeId);
  };

  const handleReport = async () => {
    if (!product) return;
    try {
      await moderationAgent.reportProduct(product.id, 'inappropriate');
      setInfoModal({
        visible: true,
        title: 'דיווח נשלח',
        message: 'תודה שדיווחת על המוצר',
        type: 'success',
      });
    } catch (err) {
      errorLog('Error reporting product:', err);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שליחת הדיווח נכשלה',
        type: 'error',
      });
    }
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const handleProductSaved = (p: Product) => {
    setProduct(p);
  };

  const handleProductDeleted = (id: string) => {
    back();
  };


  if (!product) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <GlobalHeader showSearch={false} />
        <View
          style={[styles.header, { borderBottomColor: colors.border.primary }]}
        >
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            טוען...
          </Text>
          <View style={commonStyles.spacer24} />
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  const allMedia = getAllMedia();
  const mainImageUri =
    product.images?.[0] ||
    videoThumbnails['video_0'];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <GlobalHeader showSearch={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => back()}>
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
            {isStoreOwner && (
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

        {/* Main Product Image */}
        <TouchableOpacity
          style={styles.coverImageContainer}
          onPress={() => openMediaViewer(0)}
        >
          {mainImageUri ? (
            <SmartImage
              uri={mainImageUri}
              width={COVER_SIZE}
              height={COVER_SIZE}
              contentFit="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <ImageIcon size={64} color={colors.text.secondary} />
              <Text style={[styles.noImageText, { color: colors.text.secondary }]}>
                אין תמונה
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ——— Product Media Carousel ——— */}
        {allMedia.length > 1 && (
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
                  <SmartImage
                    uri={media.type === 'video' ? videoThumbnails[media.id] || media.uri : media.uri}
                    width={80}
                    height={80}
                    contentFit="cover"
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
                    star <= Math.floor(averageRating)
                      ? colors.gold
                      : colors.interactive.disabled
                  }
                  fill={
                    star <= Math.floor(averageRating)
                      ? colors.gold
                      : 'transparent'
                  }
                />
              ))}
              <Text
                style={[styles.ratingText, { color: colors.text.secondary }]}
              >
                {averageRating.toFixed(1)} ({reviews.length} ביקורות)
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
                    <SmartImage
                      uri={media.type === 'video' ? videoThumbnails[media.id] || media.uri : media.uri}
                      width={80}
                      height={80}
                      contentFit="cover"
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
                {`סה"כ: ${currencySymbol}${totalPrice.toFixed(2)}`}
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

          <TouchableOpacity
            style={[styles.messageSellerButton, { backgroundColor: colors.gold }]}
            onPress={handleMessageSeller}
          >
            <MessageCircle size={20} color={colors.text.inverse} />
            <Text
              style={[styles.messageSellerText, { color: colors.text.inverse }]}
            >
              Message Seller
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reportButton,
              {
                borderColor: colors.status.error,
                backgroundColor: colors.surface.primary,
              },
            ]}
            onPress={handleReport}
          >
            <Shield size={20} color={colors.status.error} />
            <Text
              style={[styles.reportButtonText, { color: colors.status.error }]}
            >
              Report
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text
              style={[styles.sectionTitle, { color: colors.text.primary }]}
            >
              ביקורות
            </Text>
            {reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text
                    style={[styles.reviewAuthor, { color: colors.text.primary }]}
                  >
                    {rev.userName}
                  </Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        color={
                          s <= rev.rating
                            ? colors.gold
                            : colors.interactive.disabled
                        }
                        fill={
                          s <= rev.rating ? colors.gold : 'transparent'
                        }
                      />
                    ))}
                  </View>
                </View>
                {rev.comment && (
                  <Text
                    style={[
                      styles.reviewComment,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {rev.comment}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingCartWidget />

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
  coverImageContainer: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    aspectRatio: 1,
    marginBottom: 16,
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
  videoIndicator: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
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
  messageSellerButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  messageSellerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  reviewsSection: {
    marginTop: 24,
  },
  reviewItem: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontWeight: '600',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    textAlign: 'right',
  },
});
