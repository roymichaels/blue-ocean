import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useAppRouter } from '@/services';
import { Package, ArrowLeft, ChevronLeft, ShoppingBag, Clock, Truck } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { Order, CartItem } from '../../types';
import { useTheme } from '@/ui/ThemeProvider';
import AppShell from '../../components/layout/AppShell';
import EmptyState from '@/shared/ui/EmptyState';
import OrderTrackingModal from '../../components/OrderTrackingModal';
import { useAuthModal } from '@/features/auth/AuthModalContext';
import commonStyles from '@/constants/styles';
import { useLanguage } from '@/ui/ThemeProvider';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useOrders } from '@/services';
import { requireEnv } from '@/services/config';

const OrderItem = React.memo(({ item }: { item: CartItem }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Text style={[styles.itemText, { color: colors.text.secondary }]}>
      {t('orders.itemQuantity', {
        name: item.product.name,
        quantity: item.quantity,
      })}
    </Text>
  );
});



export default function OrdersScreen() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const { openAuthModal } = useAuthModal();
  const { isLoggedIn, user } = useAuth();
  const { colors } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const { currencySymbol } = useCurrency();
  const { push, back } = useAppRouter();
  const storeEnv = 'expo_public_default_store'.toUpperCase();
  const storeId = requireEnv(storeEnv, 'default');
  const { data: orders = [], refetch } = useOrders(storeId);

  useEffect(() => {
    if (isLoggedIn && user) {
      refetch();
    }
  }, [isLoggedIn, user, refetch]);

  const openOrderTracking = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderTracking(true);
  };

  const getOrderStatusText = (status: string) =>
    t(`orders.status.${status}`, status);

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'order_received': return colors.status.warning;
      case 'courier_found': return colors.interactive.primary;
      case 'courier_picked_up': return colors.interactive.primary;
      case 'courier_on_way': return colors.gold;
      case 'delivered': return colors.status.success;
      default: return colors.text.secondary;
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'order_received': return <ShoppingBag size={20} color={colors.status.warning} />;
      case 'courier_found': return <Clock size={20} color={colors.interactive.primary} />;
      case 'courier_picked_up': return <Package size={20} color={colors.interactive.primary} />;
      case 'courier_on_way': return <Truck size={20} color={colors.gold} />;
      case 'delivered': return <Package size={20} color={colors.status.success} />;
      default: return <Package size={20} color={colors.text.secondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      (currentLanguage === 'he' ? 'he-il' : 'en-us').toUpperCase(),
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };

  const handleLogin = () => {
    openAuthModal();
  };

  const userOrders = orders.filter((o) => o.userId === user?.id);


  const renderOrder = useCallback(
    ({ item: order }: { item: Order }) => (
    <TouchableOpacity
      style={[
        styles.orderCard,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
        },
      ]}
      onPress={() => openOrderTracking(order)}
    >
      <View style={[styles.orderHeader, { borderBottomColor: colors.border.secondary }]}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderNumber, { color: colors.text.primary }]}>
            {t('orders.orderNumber', { id: order.id.slice(-6) })}
          </Text>
          <Text style={[styles.orderDate, { color: colors.text.secondary }]}>
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
        <Text style={[styles.itemsTitle, { color: colors.text.primary }]}>
          {t('orders.itemsLabel')}
        </Text>
        {order.items.slice(0, 2).map((item, index) => (
          <OrderItem key={index} item={item} />
        ))}
        {order.items.length > 2 && (
          <Text style={[styles.moreItems, { color: colors.gold }]}>
            {t('orders.moreItems', { count: order.items.length - 2 })}
          </Text>
        )}
      </View>

      <View style={[styles.orderFooter, { borderTopColor: colors.border.secondary }]}>
        <Text style={[styles.orderTotal, { color: colors.gold }]}>
          {currencySymbol}
          {order.total.toFixed(2)}
        </Text>
        <View style={styles.viewDetails}>
          <Text style={[styles.viewDetailsText, { color: colors.gold }]}>
            {t('orders.details')}
          </Text>
          <ChevronLeft size={16} color={colors.gold} />
        </View>
      </View>
    </TouchableOpacity>
  ),
  [
    colors,
    t,
    currencySymbol,
    openOrderTracking,
    getOrderStatusColor,
    getOrderStatusIcon,
    getOrderStatusText,
    formatDate,
  ],
);


  const renderEmpty = () => (
    isLoggedIn ? (
      <EmptyState
        icon={Package}
        title={t('orders.emptyTitle') as string}
        message={t('orders.emptyMessage') as string}
        actionText={t('orders.shopNow') as string}
        onAction={() => push('/')}
      />
    ) : (
      <EmptyState
        icon={Package}
        title={t('orders.loginRequiredTitle') as string}
        message={t('orders.loginRequiredMessage') as string}
        actionText={t('auth.login') as string}
        onAction={handleLogin}
      />
    )
  );

  return (
    <AppShell showSearch={false}>

      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}> 
        <TouchableOpacity onPress={() => back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}> 
          {t('orders.myOrders')}
        </Text>
        <View style={commonStyles.spacer24} />
      </View>
      <FlatList
        data={isLoggedIn ? userOrders : []}
        keyExtractor={(order) => order.id}
        renderItem={renderOrder}
        contentContainerStyle={[
          styles.content,
          { flexGrow: 1 },
          isLoggedIn && userOrders.length > 0 && styles.ordersList
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        visible={showOrderTracking}
        onClose={() => setShowOrderTracking(false)}
        order={selectedOrder}
      />
    </AppShell>
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
    marginStart: 4,
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
});
