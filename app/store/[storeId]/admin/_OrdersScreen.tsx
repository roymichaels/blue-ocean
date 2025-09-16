import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import type { Order, OrderStatus } from '@/types';
import { useOrders } from '@/services/useOrders';
import { ordersWarmCache } from '@/services/nearOrders';
import ordersAgent, { ALLOWED_STATUS_TRANSITIONS } from '@/agents/orders-agent';
import { Spinner } from '@/ui/primitives';
import { useLaunchGate } from '@/features/launchGate/LaunchGateContext';
import OrderTrackingModal from '@/components/OrderTrackingModal';
import { useAppRouter } from '@/services';

const SHIPPING_SEQUENCE: OrderStatus[] = [
  'order_received',
  'courier_found',
  'courier_picked_up',
  'courier_on_way',
];

const FILTERS = [
  { id: 'open', label: 'פתוחות' },
  { id: 'completed', label: 'הושלמו' },
  { id: 'refunded', label: 'בוטלו' },
  { id: 'all', label: 'הכל' },
] as const;

type FilterKey = typeof FILTERS[number]['id'];

function getCreatedAt(order: Order): number {
  const ts = order.createdAt ? new Date(order.createdAt).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
}

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('he-IL');
  } catch {
    return value;
  }
}

function getFilterPredicate(filter: FilterKey): (order: Order) => boolean {
  switch (filter) {
    case 'open':
      return (order) => !['delivered', 'released', 'refunded'].includes(order.status);
    case 'completed':
      return (order) => ['delivered', 'released'].includes(order.status);
    case 'refunded':
      return (order) => order.status === 'refunded';
    default:
      return () => true;
  }
}

async function advanceStatus(order: Order, target: OrderStatus): Promise<Order> {
  let current = order;
  const visited = new Set<OrderStatus>();
  while (current.status !== target) {
    visited.add(current.status);
    const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] || [];
    if (allowed.length === 0) break;
    const next = allowed.includes(target) ? target : allowed[0];
    if (visited.has(next)) break;
    const updated: Order = {
      ...current,
      status: next,
      updatedAt: new Date().toISOString(),
    };
    await ordersAgent.update(updated);
    ordersWarmCache.mutate({ id: updated.id, value: updated, ts: Date.now() });
    current = updated;
  }
  return current;
}

export default function StoreOrdersScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ storeId: string; orderId?: string | string[] }>();
  const storeId = params.storeId;
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { requireUnlock } = useLaunchGate();
  const { replace } = useAppRouter();
  const [filter, setFilter] = useState<FilterKey>('open');
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const {
    data: fetchedOrders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useOrders(storeId ?? null);

  useEffect(() => {
    if (!storeId) return;
    const sorted = fetchedOrders
      .filter((order) => order.items?.[0]?.product?.storeId === storeId)
      .slice()
      .sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
    setOrders(sorted);
  }, [fetchedOrders, storeId]);

  useEffect(() => {
    if (!storeId) return;
    const unsubscribe = ordersWarmCache.subscribe(
      (_, value) => {
        if (!storeId) return false;
        if (!value) return true;
        return value.items?.[0]?.product?.storeId === storeId;
      },
      (id, value) => {
        setOrders((prev) => {
          if (!value) {
            return prev.filter((order) => order.id !== id);
          }
          if (value.items?.[0]?.product?.storeId !== storeId) return prev;
          const next = prev.some((order) => order.id === value.id)
            ? prev.map((order) => (order.id === value.id ? value : order))
            : [value, ...prev];
          return next
            .slice()
            .sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
        });
      },
    );
    return () => unsubscribe?.();
  }, [storeId]);

  useEffect(() => {
    if (!orderIdParam) {
      setDetailsVisible(false);
      setSelectedOrder(null);
      return;
    }
    const match = orders.find((order) => order.id === orderIdParam);
    if (match) {
      setSelectedOrder(match);
      setDetailsVisible(true);
    }
  }, [orderIdParam, orders]);

  useEffect(() => {
    if (!detailsVisible || !selectedOrder) return;
    const updated = orders.find((order) => order.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  }, [detailsVisible, orders, selectedOrder?.id]);

  const filtered = useMemo(() => orders.filter(getFilterPredicate(filter)), [orders, filter]);

  const handleMarkShipped = useCallback(
    async (order: Order) => {
      setPendingId(order.id);
      try {
        let target: OrderStatus | null = null;
        if (order.status === 'courier_on_way') {
          target = 'delivered';
        } else if (SHIPPING_SEQUENCE.includes(order.status)) {
          target = 'courier_on_way';
        }
        if (!target) {
          throw new Error('לא ניתן לסמן הזמנה זו כנשלחה');
        }
        const pathIndex = SHIPPING_SEQUENCE.indexOf(order.status);
        let updated = order;
        if (target === 'courier_on_way' && pathIndex >= 0) {
          for (const step of SHIPPING_SEQUENCE.slice(pathIndex + 1)) {
            updated = await advanceStatus(updated, step);
            if (step === 'courier_on_way') break;
          }
        } else {
          updated = await advanceStatus(updated, target);
        }
        setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch (error) {
        Alert.alert('שגיאה', 'עדכון סטטוס ההזמנה נכשל');
      } finally {
        setPendingId(null);
      }
    },
    [],
  );

  const handleCancel = useCallback(
    (order: Order) => {
      Alert.alert('ביטול הזמנה', 'האם לבטל את ההזמנה?', [
        { text: 'לא', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: async () => {
            setPendingId(order.id);
            try {
              await requireUnlock('order.cancel');
              const updated: Order = {
                ...order,
                status: 'refunded',
                updatedAt: new Date().toISOString(),
              };
              await ordersAgent.update(updated);
              ordersWarmCache.mutate({ id: updated.id, value: updated, ts: Date.now() });
              setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            } catch (error) {
              Alert.alert('שגיאה', 'ביטול ההזמנה נכשל');
            } finally {
              setPendingId(null);
            }
          },
        },
      ]);
    },
    [requireUnlock],
  );

  const closeDetails = useCallback(() => {
    setDetailsVisible(false);
    setSelectedOrder(null);
    if (storeId) {
      replace(`/store/${storeId}/admin/orders`);
    }
  }, [replace, storeId]);

  const refreshing = isLoading || isRefetching;

  if (!storeId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.primary }}>בחר חנות להצגת הזמנות.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.filterButton,
                {
                  borderColor: active ? colors.gold : colors.border.primary,
                  backgroundColor: active ? colors.surface.secondary : 'transparent',
                },
              ]}
              onPress={() => setFilter(item.id)}
              accessibilityRole="button">
              <Text style={{ color: active ? colors.gold : colors.text.primary }}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.centered}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => (
            <OrderRow
              order={item}
              colors={colors}
              busy={pendingId === item.id}
              onMarkShipped={handleMarkShipped}
              onCancel={handleCancel}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
          ListEmptyComponent={
            <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
              {t('orders.emptyTitle', 'אין הזמנות להצגה')}
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      <OrderTrackingModal visible={detailsVisible} order={selectedOrder} onClose={closeDetails} />
    </View>
  );
}

interface OrderRowProps {
  order: Order;
  colors: any;
  busy: boolean;
  onMarkShipped: (order: Order) => void;
  onCancel: (order: Order) => void;
}

function OrderRow({ order, colors, busy, onMarkShipped, onCancel }: OrderRowProps) {
  const actionableStatuses: OrderStatus[] = [
    'order_received',
    'courier_found',
    'courier_picked_up',
    'courier_on_way',
  ];
  const actionable = actionableStatuses.includes(order.status);
  const cancellable = ['order_received', 'courier_found'].includes(order.status);
  return (
    <View
      style={[
        styles.orderCard,
        { borderColor: colors.border.primary, backgroundColor: colors.surface.primary, opacity: busy ? 0.6 : 1 },
      ]}>
      <View style={styles.orderHeader}>
        <Text style={[styles.orderTitle, { color: colors.text.primary }]}>#{order.id}</Text>
        <Text style={{ color: colors.text.secondary }}>{formatDate(order.createdAt)}</Text>
      </View>
      <View style={styles.orderMeta}>
        <Text style={{ color: colors.text.secondary }}>סטטוס: {order.status}</Text>
        <Text style={{ color: colors.text.secondary }}>
          סכום: ₪{order.total.toLocaleString('he-IL')}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border.primary }]}
          onPress={() => onMarkShipped(order)}
          disabled={!actionable || busy}>
          <Text style={{ color: colors.text.primary }}>
            {order.status === 'courier_on_way' ? 'סמן נמסר' : 'סמן נשלח'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerButton, { borderColor: colors.status.error }]}
          onPress={() => onCancel(order)}
          disabled={!cancellable || busy}>
          <Text style={{ color: colors.status.error }}>בטל</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  filterButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  listContent: { gap: 12, paddingBottom: 48 },
  orderCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderTitle: { fontSize: 16, fontWeight: '600' },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dangerButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
