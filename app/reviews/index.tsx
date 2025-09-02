import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Plus, X, Send, Filter, Search, ThumbsUp, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import DatabaseService from '../../services/database';
import { Product, Review, Order } from '../../types';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Spinner from '../../components/ui/Spinner';
import InfoModal from '../../components/InfoModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useAuthModal } from '@/features/auth/AuthModalContext';
import commonStyles from '@/constants/styles';
import Card from '../../components/Card';
import SmartImage from '../../components/SmartImage';
import ErrorBoundary from '@/components/ui/ErrorBoundary';



export default function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const { openAuthModal } = useAuthModal();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    comment: '',
  });
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-reviews'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const { isLoggedIn, isAdmin, user } = useAuth();
  const { colors } = useTheme();
  const { push, back, replace } = useAppRouter();

  const goBack = () => {
    // If there's no history, navigate home
    const canGoBack =
      typeof (router as any).canGoBack === 'function' &&
      (router as any).canGoBack();
    if (canGoBack) {
      back();
    } else {
      replace('/');
    }
  };

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  // Confirmation modal for delete
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    reviewId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const reviewsData = await db.getReviews();
      setReviews(reviewsData);
      
      // Load user orders if logged in
      if (isLoggedIn && user) {
        // Fetch user's orders directly from the database
        const orders = await db.getUserOrders(user.id);

        // Only get delivered orders
        const deliveredOrders = orders.filter(order => order.status === 'delivered');
        setUserOrders(deliveredOrders);
      }
    } catch (error) {
      errorLog('Error loading reviews:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת הביקורות נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!selectedOrder || newReview.rating === 0 || !newReview.title.trim()) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות הנדרשים',
        type: 'error'
      });
      return;
    }

    // Check if user already reviewed this order
    const existingReview = reviews.find(
      r => r.userId === user?.id && r.orderId === selectedOrder.id
    );

    if (existingReview) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'כבר כתבת ביקורת על הזמנה זו',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      
      // Get the first product from the order for the review
      const firstItem = selectedOrder.items[0];
      
      const review: Review = {
        id: Date.now().toString(),
        productId: firstItem.product.id,
        productName: firstItem.product.name,
        productImage: firstItem.product.images[0],
        orderId: selectedOrder.id,
        userId: user?.id || 'guest_user',
        userName: user?.displayName || 'משתמש אורח',
        userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
        date: new Date().toISOString(),
        helpful: 0,
        verified: true,
      };

      await db.addReview(review);
      
      // Update reviews list
      setReviews(prev => [review, ...prev]);
      
      // Update product rating and reviews count
      const productReviews = [...reviews.filter(r => r.productId === firstItem.product.id), review];
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      
      await db.updateProduct(firstItem.product.id, {
        rating: parseFloat(avgRating.toFixed(1)),
        reviews: productReviews.length
      });
      
      setShowWriteReview(false);
      setSelectedOrder(null);
      setNewReview({ rating: 0, title: '', comment: '' });
      
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'הביקורת שלך נשלחה בהצלחה!',
        type: 'success'
      });
    } catch (error) {
      errorLog('Error submitting review:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שליחת הביקורת נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      // Update local state
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, helpful: review.helpful + 1 } 
            : review
        )
      );
      
      // Update in database
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        const db = DatabaseService.getInstance();
        await db.updateReview(reviewId, { helpful: review.helpful + 1 });
      }
    } catch (error) {
      errorLog('Error marking review as helpful:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'סימון הביקורת כמועילה נכשל',
        type: 'error'
      });
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      
      // Get the review to be deleted
      const reviewToDelete = reviews.find(r => r.id === reviewId);
      if (!reviewToDelete) {
        throw new Error('Review not found');
      }
      
      // Delete the review
      await db.deleteReview(reviewId);
      
      // Update local reviews state
      const updatedReviews = reviews.filter(r => r.id !== reviewId);
      setReviews(updatedReviews);
      
      // Update product rating and reviews count
      const productReviews = updatedReviews.filter(r => r.productId === reviewToDelete.productId);
      const avgRating = productReviews.length > 0 
        ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
        : 0;
      
      await db.updateProduct(reviewToDelete.productId, {
        rating: parseFloat(avgRating.toFixed(1)),
        reviews: productReviews.length
      });
      
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'הביקורת נמחקה בהצלחה',
        type: 'success'
      });
    } catch (error) {
      errorLog('Error deleting review:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'מחיקת הביקורת נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => interactive && setNewReview(prev => ({ ...prev, rating: star }))}
          >
            <Star
              size={size}
              color={star <= rating ? colors.gold : colors.interactive.disabled}
              fill={star <= rating ? colors.gold : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReview = (item: Review) => (
    <Card key={item.id} style={[styles.reviewCard, {
      backgroundColor: colors.surface.primary,
      borderColor: colors.border.primary,
    }]}> 
      <View style={styles.reviewHeader}>
        <TouchableOpacity 
          style={styles.productInfo}
          onPress={() => push(`/product/${item.productId}`)}
        >
          <SmartImage
            uri={item.productImage}
            width={40}
            height={40}
            style={styles.productThumbnail}
          />
          <View style={styles.productDetails}>
            <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={1}>
              {item.productName}
            </Text>
            {renderStars(item.rating)}
          </View>
        </TouchableOpacity>
        <Text style={[styles.reviewDate, { color: colors.text.tertiary }]}>
          {new Date(item.date).toLocaleDateString('he-IL')}
        </Text>
      </View>

      <View style={[styles.reviewContent, { borderTopColor: colors.border.primary }]}>
        <View style={styles.userInfo}>
          <SmartImage
            uri={item.userAvatar}
            width={32}
            height={32}
            style={styles.userAvatar}
          />
          <View>
            <Text style={[styles.userName, { color: colors.text.primary }]}>{item.userName}</Text>
            {item.verified && (
              <Text style={[styles.verifiedBadge, { color: colors.gold }]}>✓ רכישה מאומתת</Text>
            )}
          </View>
        </View>

        <Text style={[styles.reviewTitle, { color: colors.text.primary }]}>{item.title}</Text>
        {item.comment && (
          <Text style={[styles.reviewComment, { color: colors.text.secondary }]}>{item.comment}</Text>
        )}

        <View style={styles.reviewActions}>
          <TouchableOpacity 
            style={[styles.helpfulButton, { 
              backgroundColor: colors.surface.secondary, 
              borderColor: colors.border.primary 
            }]}
            onPress={() => markHelpful(item.id)}
          >
            <ThumbsUp size={14} color={colors.text.secondary} style={styles.helpfulIcon} />
            <Text style={[styles.helpfulText, { color: colors.text.secondary }]}>
              מועיל ({item.helpful})
            </Text>
          </TouchableOpacity>
          
          {(item.userId === (user?.id || 'guest_user') || isAdmin) && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
              onPress={() => setDeleteModal({ visible: true, reviewId: item.id })}
            >
              <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  const renderOrderSelector = (item: Order) => {
    // Check if user already reviewed this order
    const alreadyReviewed = reviews.some(
      review => review.orderId === item.id && review.userId === user?.id
    );

    return (
      <Card
        Component={TouchableOpacity}
        key={item.id}
        style={[
          styles.orderSelectorItem,
          {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary,
          },
          alreadyReviewed && styles.orderSelectorItemDisabled
        ]}
        onPress={() => {
          if (!alreadyReviewed) {
            setSelectedOrder(item);
          } else {
            setInfoModal({
              visible: true,
              title: 'שגיאה',
              message: 'כבר כתבת ביקורת על הזמנה זו',
              type: 'error'
            });
          }
        }}
        disabled={alreadyReviewed}
      >
        <View style={styles.orderSelectorInfo}>
          <Text style={[styles.orderSelectorTitle, { color: colors.text.primary }]}>
            הזמנה #{item.id.slice(-6)}
          </Text>
          <Text style={[styles.orderSelectorDate, { color: colors.text.secondary }]}>
            {new Date(item.createdAt).toLocaleDateString('he-IL')}
          </Text>
          <View style={[styles.orderSelectorItems, { borderTopColor: colors.border.secondary }]}>
            {item.items.slice(0, 2).map((orderItem, index) => (
              <View key={index} style={styles.orderSelectorItemRow}>
                <SmartImage
                  uri={orderItem.product.images[0]}
                  width={40}
                  height={40}
                  style={styles.orderSelectorItemImage}
                />
                <Text style={[styles.orderSelectorItemName, { color: colors.text.primary }]} numberOfLines={1}>
                  {orderItem.product.name} x{orderItem.quantity}
                </Text>
              </View>
            ))}
            {item.items.length > 2 && (
              <Text style={[styles.orderSelectorMoreItems, { color: colors.gold }]}>
                +{item.items.length - 2} פריטים נוספים
              </Text>
            )}
          </View>
        </View>
        
        {alreadyReviewed && (
          <View style={[styles.alreadyReviewedBadge, { backgroundColor: colors.gold }]}>
            <Text style={[styles.alreadyReviewedText, { color: colors.text.inverse }]}>נסקר</Text>
          </View>
        )}
      </Card>
    );
  };

  const filteredReviews = reviews.filter(review => {
    const matchesRating = filterRating ? review.rating === filterRating : true;
    const matchesSearch = searchQuery
      ? review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (review.comment && review.comment.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    const matchesTab = activeTab === 'my-reviews' 
      ? review.userId === (user?.id || 'guest_user') 
      : true;
    
    return matchesRating && matchesSearch && matchesTab;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === 'highest') {
      return b.rating - a.rating;
    } else if (sortBy === 'lowest') {
      return a.rating - b.rating;
    }
    return 0;
  });

  const handleLogin = () => {
    openAuthModal();
  };

  if (loading && reviews.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={goBack} style={[styles.backButton, { 
            backgroundColor: colors.surface.primary, 
            borderColor: colors.border.primary 
          }]}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>ביקורות</Text>
          <View style={commonStyles.spacer40} />
        </View>
        <Spinner label="Loading reviews" />
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={goBack} style={[styles.backButton, { 
          backgroundColor: colors.surface.primary, 
          borderColor: colors.border.primary 
        }]}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>ביקורות</Text>
        <TouchableOpacity
          style={[styles.writeReviewButton, { backgroundColor: colors.gold }]}
          onPress={() => {
            if (!isLoggedIn) {
              setInfoModal({
                visible: true,
                title: 'נדרשת התחברות',
                message: 'עליך להתחבר כדי לכתוב ביקורת',
                type: 'info'
              });
              return;
            }
            
            // Check if user has any completed orders
            if (userOrders.length === 0) {
              setInfoModal({
                visible: true,
                title: 'אין הזמנות',
                message: 'עליך להשלים הזמנה לפני שתוכל לכתוב ביקורת',
                type: 'warning'
              });
              return;
            }
            
            setShowWriteReview(true);
          }}
        >
          <Plus size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface.primary }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && { backgroundColor: colors.gold }]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, { color: colors.text.primary }, activeTab === 'all' && { color: colors.text.inverse }]}>
            כל הביקורות
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-reviews' && { backgroundColor: colors.gold }]}
          onPress={() => setActiveTab('my-reviews')}
        >
          <Text style={[styles.tabText, { color: colors.text.primary }, activeTab === 'my-reviews' && { color: colors.text.inverse }]}>
            הביקורות שלי
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={[styles.searchContainer, { 
          backgroundColor: colors.surface.primary, 
          borderColor: colors.border.primary 
        }]}>
          <Search size={20} color="#999" />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="חיפוש ביקורות..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="end"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { 
            backgroundColor: colors.surface.primary, 
            borderColor: colors.border.primary 
          }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Rating Filter - Improved Design */}
      <View style={styles.ratingFilterContainer}>
        <Text style={[styles.ratingFilterLabel, { color: colors.text.primary }]}>סינון לפי דירוג:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ratingFilter}
        >
          <TouchableOpacity
            style={[
              styles.ratingFilterChip, 
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
              !filterRating && { backgroundColor: colors.gold, borderColor: colors.gold }
            ]}
            onPress={() => setFilterRating(null)}
          >
            <Text style={[
              styles.ratingFilterText, 
              { color: colors.text.primary },
              !filterRating && { color: colors.text.inverse }
            ]}>
              הכל
            </Text>
          </TouchableOpacity>
          
          {[5, 4, 3, 2, 1].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.ratingFilterChip, 
                { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
                filterRating === rating && { backgroundColor: colors.gold, borderColor: colors.gold }
              ]}
              onPress={() => setFilterRating(rating)}
            >
              <View style={styles.ratingFilterContent}>
                <Star 
                  size={14} 
                  color={filterRating === rating ? colors.text.inverse : colors.gold} 
                  fill={filterRating === rating ? colors.text.inverse : colors.gold} 
                />
                <Text style={[
                  styles.ratingFilterText, 
                  { color: colors.text.primary },
                  filterRating === rating && { color: colors.text.inverse }
                ]}>
                  {rating}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reviews List */}
      <ScrollView
        style={styles.reviewsList}
        showsVerticalScrollIndicator={false}
      >
        {filteredReviews.length > 0 ? (
          filteredReviews.map(renderReview)
        ) : (
          <View style={styles.emptyContainer}>
            <Star size={80} color={colors.interactive.disabled} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>לא נמצאו ביקורות</Text>
            <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
              {activeTab === 'my-reviews' 
                ? "עדיין לא כתבת ביקורות" 
                : "היה הראשון לכתוב ביקורת!"}
            </Text>
            {activeTab === 'my-reviews' && userOrders.length > 0 && (
              <TouchableOpacity 
                style={[styles.emptyButton, { backgroundColor: colors.gold }]}
                onPress={() => setShowWriteReview(true)}
              >
                <Text style={[styles.emptyButtonText, { color: colors.text.inverse }]}>כתוב ביקורת</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Write Review Modal */}
      <Modal
        visible={showWriteReview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWriteReview(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {selectedOrder ? 'כתיבת ביקורת' : 'בחירת הזמנה'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowWriteReview(false);
                setSelectedOrder(null);
                setNewReview({ rating: 0, title: '', comment: '' });
              }}
            >
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {!selectedOrder ? (
            <ScrollView
              style={styles.orderSelectorList}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.orderSelectorHeader, { color: colors.text.primary }]}>
                בחר הזמנה שהושלמה כדי לכתוב עליה ביקורת
              </Text>
              
              {userOrders.length > 0 ? (
                userOrders.map(renderOrderSelector)
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>אין הזמנות שהושלמו</Text>
                  <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
                    השלם הזמנה כדי לכתוב ביקורת
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <ScrollView style={styles.reviewForm}>
              <Card style={[styles.selectedOrder, {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              }]}> 
                <Text style={[styles.selectedOrderTitle, { color: colors.text.primary }]}>
                  הזמנה #{selectedOrder.id.slice(-6)}
                </Text>
                <Text style={[styles.selectedOrderDate, { color: colors.text.secondary }]}>
                  {new Date(selectedOrder.createdAt).toLocaleDateString('he-IL')}
                </Text>
                
                <View style={[styles.selectedOrderItems, { borderTopColor: colors.border.secondary }]}>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={styles.selectedOrderItem}>
                      <SmartImage
                        uri={item.product.images[0]}
                        width={50}
                        height={50}
                        style={styles.selectedOrderItemImage}
                      />
                      <View style={styles.selectedOrderItemDetails}>
                        <Text style={[styles.selectedOrderItemName, { color: colors.text.primary }]}>
                          {item.product.name}
                        </Text>
                        <Text style={[styles.selectedOrderItemQuantity, { color: colors.text.secondary }]}>
                          כמות: {item.quantity}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>

              <View style={styles.ratingSection}>
                <Text style={[styles.formLabel, { color: colors.text.primary }]}>דירוג *</Text>
                {renderStars(newReview.rating, 32, true)}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.formLabel, { color: colors.text.primary }]}>כותרת הביקורת *</Text>
                <TextInput
                  style={[styles.titleInput, { 
                    borderColor: colors.border.primary, 
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary 
                  }]}
                  value={newReview.title}
                  onChangeText={(text) => setNewReview(prev => ({ ...prev, title: text }))}
                  placeholder="סכם את החוויה שלך"
                  maxLength={100}
                  textAlign="end"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.formLabel, { color: colors.text.primary }]}>ביקורת (אופציונלי)</Text>
                <TextInput
                  style={[styles.commentInput, { 
                    borderColor: colors.border.primary, 
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary 
                  }]}
                  value={newReview.comment}
                  onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
                  placeholder="שתף את החוויה המפורטת שלך..."
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlign="end"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.gold },
                  (!newReview.rating || !newReview.title.trim()) && { backgroundColor: colors.interactive.disabled }
                ]}
                onPress={submitReview}
                disabled={!newReview.rating || !newReview.title.trim() || loading}
              >
                {loading ? (
                  <Spinner size="small" color={colors.text.inverse} />
                ) : (
                  <>
                    <Send size={20} color={colors.text.inverse} />
                    <Text style={[styles.submitButtonText, { color: colors.text.inverse }]}>שלח ביקורת</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: colors.surface.elevated }]}>
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: colors.text.primary }]}>מיון וסינון</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>מיון לפי</Text>
              <TouchableOpacity 
                style={[styles.filterOption, sortBy === 'newest' && { backgroundColor: colors.interactive.secondary }]}
                onPress={() => setSortBy('newest')}
              >
                <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>החדשות ביותר</Text>
                {sortBy === 'newest' && <View style={[styles.selectedFilterDot, { backgroundColor: colors.gold }]} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterOption, sortBy === 'highest' && { backgroundColor: colors.interactive.secondary }]}
                onPress={() => setSortBy('highest')}
              >
                <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>דירוג גבוה</Text>
                {sortBy === 'highest' && <View style={[styles.selectedFilterDot, { backgroundColor: colors.gold }]} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterOption, sortBy === 'lowest' && { backgroundColor: colors.interactive.secondary }]}
                onPress={() => setSortBy('lowest')}
              >
                <Text style={[styles.filterOptionText, { color: colors.text.primary }]}>דירוג נמוך</Text>
                {sortBy === 'lowest' && <View style={[styles.selectedFilterDot, { backgroundColor: colors.gold }]} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.applyFilterButton, { backgroundColor: colors.gold }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={[styles.applyFilterButtonText, { color: colors.text.inverse }]}>החל מסננים</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModal.visible}
        title="אישור מחיקה"
        message="האם אתה בטוח שברצונך למחוק ביקורת זו?"
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={() => {
          setDeleteModal({ visible: false, reviewId: '' });
          deleteReview(deleteModal.reviewId);
        }}
        onCancel={() => setDeleteModal({ visible: false, reviewId: '' })}
        destructive
      />
      </SafeAreaView>
    </ErrorBoundary>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  writeReviewButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  ratingFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  ratingFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'end',
  },
  ratingFilter: {
    paddingRight: 16,
  },
  ratingFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingFilterText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productThumbnail: {
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewContent: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    borderRadius: 16,
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'end',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'end',
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  helpfulIcon: {
    marginRight: 4,
  },
  helpfulText: {
    fontSize: 12,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  orderSelectorList: {
    flex: 1,
    padding: 16,
  },
  orderSelectorHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  orderSelectorItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  orderSelectorItemDisabled: {
    opacity: 0.6,
  },
  orderSelectorInfo: {
    flex: 1,
  },
  orderSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'end',
  },
  orderSelectorDate: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'end',
  },
  orderSelectorItems: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  orderSelectorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  orderSelectorItemImage: {
    borderRadius: 8,
    marginLeft: 12,
  },
  orderSelectorItemName: {
    fontSize: 14,
    flex: 1,
    textAlign: 'end',
  },
  orderSelectorMoreItems: {
    fontSize: 12,
    textAlign: 'end',
    marginTop: 4,
  },
  alreadyReviewedBadge: {
    position: 'absolute',
    top: 12,
    start: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alreadyReviewedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewForm: {
    flex: 1,
    padding: 16,
  },
  selectedOrder: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  selectedOrderTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'end',
  },
  selectedOrderDate: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'end',
  },
  selectedOrderItems: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  selectedOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  selectedOrderItemImage: {
    borderRadius: 8,
    marginLeft: 12,
  },
  selectedOrderItemDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  selectedOrderItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'end',
  },
  selectedOrderItemQuantity: {
    fontSize: 12,
    textAlign: 'end',
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'end',
  },
  inputGroup: {
    marginBottom: 24,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'end',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterOptionText: {
    fontSize: 16,
    textAlign: 'end',
  },
  selectedFilterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  applyFilterButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  applyFilterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
