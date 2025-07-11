import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Package,
  MessageCircle,
  Users,
  Bell,
  Star,
  TrendingUp,
  ShoppingCart,
  Eye,
  Shield,
  Clock,
  DollarSign,
  Settings,
} from 'lucide-react-native';
import DatabaseService from '../../../services/database';
import NotificationService from '../../../services/notification';
import { Product, ChatRoom, Notification, Review } from '../../../types';
import { useNotifications } from '../../../components/NotificationContext';
import { useAuth } from '../../../components/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import InfoModal from '../../../components/InfoModal';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function AdminDashboardScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalReviews: 0,
    activeChats: 0,
    unreadNotifications: 0,
    averageRating: 0,
    totalStock: 0,
    pendingKycRequests: 0,
    totalUsers: 0,
  });
  const { showNotification } = useNotifications();
  const { isAdmin, isDriver, user } = useAuth();
  const { colors } = useTheme();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    // Check if user is logged in as admin
    if (!isAdmin && !isDriver) {
      router.replace('/auth/login');
      return;
    }

    loadData();
  }, [isAdmin, isDriver]);

  const loadData = async () => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const notificationService = NotificationService.getInstance();

      const [
        productsData,
        chatRoomsData,
        notificationsData,
        reviewsData,
        pendingKycRequests,
        allUsers,
      ] = await Promise.all([
        db.getProducts(),
        db.getChatRooms(),
        notificationService.getNotifications(user?.id),
        db.getReviews(),
        db.getPendingKycRequests(),
        db.getAllUserProfiles(),
      ]);

      setProducts(productsData);
      setChatRooms(chatRoomsData);
      setNotifications(notificationsData);
      setReviews(reviewsData);

      // Calculate stats
      const totalStock = productsData.reduce(
        (sum, product) => sum + product.stock,
        0
      );
      const averageRating =
        reviewsData.length > 0
          ? reviewsData.reduce((sum, review) => sum + review.rating, 0) /
            reviewsData.length
          : 0;
      const unreadNotifications = notificationsData.filter(
        (n) => !n.read
      ).length;
      const activeChats = chatRoomsData.filter(
        (room) => room.unreadCount > 0
      ).length;

      setStats({
        totalProducts: productsData.length,
        totalReviews: reviewsData.length,
        activeChats,
        unreadNotifications,
        averageRating,
        totalStock,
        pendingKycRequests: pendingKycRequests.length,
        totalUsers: allUsers.length,
      });

      // Show a welcome notification
      showNotification('ברוך הבא מנהל', 'התחברת בהצלחה ללוח הבקרה', 'success');
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('שגיאה', 'טעינת נתוני לוח הבקרה נכשלה', 'error');
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת נתוני לוח הבקרה נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToProducts = () => {
    router.push('/(tabs)');
  };

  const navigateToReviews = () => {
    router.push('/reviews');
  };

  const navigateToNotifications = () => {
    router.push('/(tabs)/notifications');
  };

  const navigateToCategories = () => {
    router.push('/(tabs)/categories');
  };

  const navigateToKycApprovals = () => {
    router.push('/admin/kyc-approvals');
  };

  const navigateToUserManagement = () => {
    router.push('/admin/user-management');
  };

  const navigateToPricingTiers = () => {
    router.push('/admin/pricing-tiers');
  };

  const navigateToSettings = () => {
    router.push('/admin/settings');
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.border.primary }]}
        >
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            לוח בקרה
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[styles.header, { borderBottomColor: colors.border.primary }]}
      >
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          לוח בקרה
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <Package size={32} color={colors.gold} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {stats.totalProducts}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                מוצרים
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <Star size={32} color={colors.gold} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {stats.totalReviews}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                ביקורות
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <MessageCircle size={32} color={colors.gold} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {stats.activeChats}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                צ'אטים פעילים
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <Bell size={32} color={colors.gold} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {stats.unreadNotifications}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                התראות חדשות
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <Users size={32} color={colors.gold} />
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {stats.totalUsers}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                משתמשים
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                stats.pendingKycRequests > 0
                  ? [
                      styles.highlightedStatCard,
                      {
                        backgroundColor: colors.interactive.secondary,
                        borderColor: colors.status.warning,
                      },
                    ]
                  : {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary,
                    },
              ]}
            >
              <Clock
                size={32}
                color={
                  stats.pendingKycRequests > 0
                    ? colors.status.warning
                    : colors.gold
                }
              />
              <Text
                style={[
                  styles.statNumber,
                  stats.pendingKycRequests > 0
                    ? [
                        styles.highlightedStatNumber,
                        { color: colors.status.warning },
                      ]
                    : { color: colors.text.primary },
                ]}
              >
                {stats.pendingKycRequests}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  stats.pendingKycRequests > 0
                    ? [
                        styles.highlightedStatLabel,
                        { color: colors.status.warning },
                      ]
                    : { color: colors.text.secondary },
                ]}
              >
                בקשות KYC ממתינות
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            פעולות מהירות
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToProducts}
            >
              <Package size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                ניהול מוצרים
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToCategories}
            >
              <Eye size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                ניהול קטגוריות
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToReviews}
            >
              <Star size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                ניהול ביקורות
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToNotifications}
            >
              <Bell size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                התראות
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToUserManagement}
            >
              <Users size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                ניהול משתמשים
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToPricingTiers}
            >
              <DollarSign size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                מדרגי מחירים
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={navigateToSettings}
            >
              <Settings size={24} color={colors.gold} />
              <Text style={[styles.actionText, { color: colors.text.primary }]}>
                הגדרות מערכת
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                stats.pendingKycRequests > 0
                  ? [
                      styles.highlightedActionCard,
                      {
                        backgroundColor: colors.interactive.secondary,
                        borderColor: colors.status.warning,
                      },
                    ]
                  : {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary,
                    },
              ]}
              onPress={navigateToKycApprovals}
            >
              <Shield
                size={24}
                color={
                  stats.pendingKycRequests > 0
                    ? colors.status.warning
                    : colors.gold
                }
              />
              <Text
                style={[
                  styles.actionText,
                  stats.pendingKycRequests > 0
                    ? [
                        styles.highlightedActionText,
                        { color: colors.status.warning },
                      ]
                    : { color: colors.text.primary },
                ]}
              >
                אישורי KYC
                {stats.pendingKycRequests > 0
                  ? ` (${stats.pendingKycRequests})`
                  : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            פעילות אחרונה
          </Text>

          {/* Recent Products */}
          <View
            style={[
              styles.activitySection,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <Text
              style={[styles.activityTitle, { color: colors.text.primary }]}
            >
              מוצרים אחרונים
            </Text>
            {products.slice(0, 3).map((product) => (
              <View key={product.id} style={styles.activityItem}>
                <Package size={16} color={colors.gold} />
                <Text
                  style={[
                    styles.activityText,
                    { color: colors.text.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {product.name} - ₪{product.price.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Recent Reviews */}
          <View
            style={[
              styles.activitySection,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <Text
              style={[styles.activityTitle, { color: colors.text.primary }]}
            >
              ביקורות אחרונות
            </Text>
            {reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.activityItem}>
                <Star size={16} color={colors.gold} />
                <Text
                  style={[
                    styles.activityText,
                    { color: colors.text.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {review.userName} - {review.rating} כוכבים
                </Text>
              </View>
            ))}
          </View>

          {/* Recent Notifications */}
          <View
            style={[
              styles.activitySection,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <Text
              style={[styles.activityTitle, { color: colors.text.primary }]}
            >
              התראות אחרונות
            </Text>
            {notifications.slice(0, 3).map((notification) => (
              <View key={notification.id} style={styles.activityItem}>
                <Bell
                  size={16}
                  color={notification.read ? colors.text.tertiary : colors.gold}
                />
                <Text
                  style={[
                    styles.activityText,
                    {
                      color: notification.read
                        ? colors.text.secondary
                        : colors.text.primary,
                    },
                    !notification.read && styles.unreadText,
                  ]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            סטטוס מערכת
          </Text>
          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, styles.statusOnline]} />
              <Text style={[styles.statusText, { color: colors.text.primary }]}>
                מערכת פעילה
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, styles.statusOnline]} />
              <Text style={[styles.statusText, { color: colors.text.primary }]}>
                בסיס נתונים מחובר
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, styles.statusOnline]} />
              <Text style={[styles.statusText, { color: colors.text.primary }]}>
                שירותי צ'אט פעילים
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
  },
  highlightedStatCard: {
    borderWidth: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  highlightedStatNumber: {
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  highlightedStatLabel: {
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  highlightedActionCard: {
    borderWidth: 2,
  },
  actionText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  highlightedActionText: {
    fontWeight: '600',
  },
  activitySection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityText: {
    fontSize: 14,
    marginRight: 8,
    flex: 1,
    textAlign: 'right',
  },
  unreadText: {
    fontWeight: '600',
  },
  statusContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'flex-end',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 14,
  },
});
