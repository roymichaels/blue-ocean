import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Package,
  ArrowLeft,
  ChevronLeft,
  ShoppingBag,
  Clock,
  Calendar,
  Truck,
} from 'lucide-react-native';
import { useAuth } from '../../../components/AuthContext';
import OrderService from '../../../services/orders';
import { Order } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';
import GlobalHeader from '../../../components/GlobalHeader';
import OrderTrackingModal from '../../../components/OrderTrackingModal';
import InfoModal from '../../../components/InfoModal';
import AuthTabsModal from '../../../components/AuthTabsModal';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const { colors } = useTheme();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    if (isLoggedIn && user) {
      loadOrders();
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    const orderService = OrderService.getInstance();
    const handleOrderUpdate = () => {
      if (isLoggedIn && user) {
        loadOrders();
      }
    };

    orderService.addListener(handleOrderUpdate);
    return () => orderService.removeListener(handleOrderUpdate);
  }, [isLoggedIn, user]);

  const loadOrders = () => {
    try {
      const orderService = OrderService.getInstance();
      const userOrders = orderService.getUserOrders(user?.id || '');
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת ההזמנות נכשלה',
        type: 'error',
      });
    }
  };

  const openOrderTracking = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderTracking(true);
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'order_received':
        return 'הזמנה התקבלה';
      case 'courier_found':
        return 'נמצא שליח';
      case 'courier_picked_up':
        return 'שליח אסף';
      case 'courier_on_way':
        return 'שליח בדרך';
      case 'delivered':
        return 'נמסר';
      default:
        return status;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'order_received':
        return colors.status.warning;
      case 'courier_found':
        return colors.interactive.primary;
      case 'courier_picked_up':
        return colors.interactive.primary;
      case 'courier_on_way':
        return colors.gold;
      case 'delivered':
        return colors.status.success;
      default:
        return colors.text.secondary;
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'order_received':
        return <ShoppingBag size={20} color={colors.status.warning} />;
      case 'courier_found':
        return <Clock size={20} color={colors.interactive.primary} />;
      case 'courier_picked_up':
        return <Package size={20} color={colors.interactive.primary} />;
      case 'courier_on_way':
        return <Truck size={20} color={colors.gold} />;
      case 'delivered':
        return <Package size={20} color={colors.status.success} />;
      default:
        return <Package size={20} color={colors.text.secondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <GlobalHeader showSearch={false} />

      <View
        style={[styles.header, { borderBottomColor: colors.border.primary }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          ההזמנות שלי
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoggedIn ? (
          orders.length > 0 ? (
            <View style={styles.ordersList}>
              {orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.border.primary,
                    },
                  ]}
                  onPress={() => openOrderTracking(order)}
                >
                  <View
                    style={[
                      styles.orderHeader,
                      { borderBottomColor: colors.border.secondary },
                    ]}
                  >
                    <View style={styles.orderInfo}>
                      <Text
                        style={[
                          styles.orderNumber,
                          { color: colors.text.primary },
                        ]}
                      >
                        הזמנה #{order.id.slice(-6)}
                      </Text>
                      <Text
                        style={[
                          styles.orderDate,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.orderStatus}>
                      {getOrderStatusIcon(order.status)}
                      <Text
                        style={[
                          styles.statusText,
                          { color: getOrderStatusColor(order.status) },
                        ]}
                      >
                        {getOrderStatusText(order.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderItems}>
                    <Text
                      style={[
                        styles.itemsTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      פריטים:
                    </Text>
                    {order.items.slice(0, 2).map((item, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.itemText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {item.product.name} x{item.quantity}
                      </Text>
                    ))}
                    {order.items.length > 2 && (
                      <Text style={[styles.moreItems, { color: colors.gold }]}>
                        +{order.items.length - 2} פריטים נוספים
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.orderFooter,
                      { borderTopColor: colors.border.secondary },
                    ]}
                  >
                    <Text style={[styles.orderTotal, { color: colors.gold }]}>
                      ₪{order.total.toFixed(2)}
                    </Text>
                    <View style={styles.viewDetails}>
                      <Text
                        style={[styles.viewDetailsText, { color: colors.gold }]}
                      >
                        פרטים
                      </Text>
                      <ChevronLeft size={16} color={colors.gold} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Package size={80} color={colors.interactive.disabled} />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                אין הזמנות עדיין
              </Text>
              <Text
                style={[styles.emptyMessage, { color: colors.text.secondary }]}
              >
                ההזמנות שלך יופיעו כאן לאחר שתבצע רכישה
              </Text>
              <TouchableOpacity
                style={[styles.shopButton, { backgroundColor: colors.gold }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Text
                  style={[
                    styles.shopButtonText,
                    { color: colors.text.inverse },
                  ]}
                >
                  התחל לקנות
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={styles.emptyState}>
            <Package size={80} color={colors.interactive.disabled} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              נדרשת התחברות
            </Text>
            <Text
              style={[styles.emptyMessage, { color: colors.text.secondary }]}
            >
              עליך להתחבר כדי לראות את ההזמנות שלך
            </Text>
            <TouchableOpacity
              style={[styles.shopButton, { backgroundColor: colors.gold }]}
              onPress={handleLogin}
            >
              <Text
                style={[styles.shopButtonText, { color: colors.text.inverse }]}
              >
                התחבר
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        visible={showOrderTracking}
        onClose={() => setShowOrderTracking(false)}
        order={selectedOrder}
      />

      {/* Auth Modal */}
      <AuthTabsModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab="login"
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'right',
  },
  orderDate: {
    fontSize: 12,
    textAlign: 'right',
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'right',
  },
  moreItems: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'right',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    marginBottom: 24,
    lineHeight: 24,
  },
  shopButton: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
