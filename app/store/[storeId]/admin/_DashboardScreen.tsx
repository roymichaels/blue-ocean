import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui/primitives';
import { useAppRouter } from '@/hooks';
import type { Order, Product, User } from '@/types';
import { ordersWarmCache } from '@/services/nearOrders';
import { productsWarmCache } from '@/features/products/services/nearProducts';
import { usersWarmCache } from '@/features/auth/services/nearUsers';
import AdminOnboardingChecklist from '@/features/home/components/AdminOnboardingChecklist';
import OrderRevenueMetrics from '@/features/stores/components/OrderRevenueMetrics';
import FeeDashboard from '@/features/billing/components/FeeDashboard';

const LOW_STOCK_THRESHOLD = 5;

function isToday(date: string | undefined): boolean {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

function isOrderForStore(order: Order | undefined, storeId: string): order is Order {
  if (!order) return false;
  return order.items?.some((item) => item.product?.storeId === storeId) ?? false;
}

function getOrderAttentionScore(order: Order): number {
  const toTime = (value?: string | null) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return Math.max(toTime(order.updatedAt), toTime(order.createdAt));
}

interface Kpis {
  ordersToday: number;
  pendingKyc: number;
  lowStock: number;
}

const initialKpis: Kpis = { ordersToday: 0, pendingKyc: 0, lowStock: 0 };

export default function StoreDashboardScreen(): React.ReactElement {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const [kpis, setKpis] = useState<Kpis>(initialKpis);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const computeKpis = useCallback(
    (nextOrders: Order[], nextProducts: Product[], nextUsers: User[]) => {
      const ordersToday = nextOrders.filter((order) => isToday(order.createdAt)).length;
      const pendingKyc = nextUsers.filter((user) => user.kycStatus === 'pending').length;
      const lowStock = nextProducts.filter(
        (product) => product.storeId === storeId && (product.stock ?? 0) <= LOW_STOCK_THRESHOLD,
      ).length;
      setKpis({ ordersToday, pendingKyc, lowStock });
    },
    [storeId],
  );

  const loadFromCaches = useCallback(() => {
    if (!storeId) return { orders: [], products: [], users: [] };
    let cachedOrders: Order[] = [];
    let cachedProducts: Product[] = [];
    let cachedUsers: User[] = [];
    try {
      cachedOrders = ordersWarmCache.list((_, order) => isOrderForStore(order, storeId));
    } catch {}
    try {
      cachedProducts = productsWarmCache.list((_, product) => product.storeId === storeId);
    } catch {}
    try {
      cachedUsers = usersWarmCache.list();
    } catch {}
    return { orders: cachedOrders, products: cachedProducts, users: cachedUsers };
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const hydrate = () => {
      const { orders: cachedOrders, products: cachedProducts, users: cachedUsers } =
        loadFromCaches();
      if (cancelled) return;
      setOrders(
        cachedOrders
          .slice()
          .sort((a, b) => getOrderAttentionScore(b) - getOrderAttentionScore(a)),
      );
      computeKpis(cachedOrders, cachedProducts, cachedUsers);
      setLoading(false);
    };

    hydrate();

    const unsubOrders = ordersWarmCache.subscribe(
      (_, order) => {
        if (!storeId) return false;
        if (!order) return false;
        return isOrderForStore(order, storeId);
      },
      () => {
        const { orders: cachedOrders, products: cachedProducts, users: cachedUsers } =
          loadFromCaches();
        if (cancelled) return;
        setOrders(
          cachedOrders
            .slice()
            .sort((a, b) => getOrderAttentionScore(b) - getOrderAttentionScore(a)),
        );
        computeKpis(cachedOrders, cachedProducts, cachedUsers);
      },
    );

    const unsubProducts = productsWarmCache.subscribe(
      (_, product) => {
        if (!storeId) return false;
        return !!product && product.storeId === storeId;
      },
      () => {
        const { orders: cachedOrders, products: cachedProducts, users: cachedUsers } =
          loadFromCaches();
        if (cancelled) return;
        computeKpis(cachedOrders, cachedProducts, cachedUsers);
      },
    );

    const unsubUsers = usersWarmCache.subscribe(
      (_id, _user) => true,
      () => {
        const { orders: cachedOrders, products: cachedProducts, users: cachedUsers } =
          loadFromCaches();
        if (cancelled) return;
        computeKpis(cachedOrders, cachedProducts, cachedUsers);
      },
    );

    return () => {
      cancelled = true;
      unsubOrders?.();
      unsubProducts?.();
      unsubUsers?.();
    };
  }, [storeId, loadFromCaches, computeKpis]);

  const onRefresh = useCallback(() => {
    if (!storeId) return;
    setRefreshing(true);
    const { orders: cachedOrders, products: cachedProducts, users: cachedUsers } =
      loadFromCaches();
    setOrders(
      cachedOrders
        .slice()
        .sort((a, b) => getOrderAttentionScore(b) - getOrderAttentionScore(a)),
    );
    computeKpis(cachedOrders, cachedProducts, cachedUsers);
    setRefreshing(false);
  }, [computeKpis, loadFromCaches, storeId]);

  const actionableOrders = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            !['delivered', 'released', 'refunded'].includes(order.status) &&
            order.items?.length,
        )
        .slice(0, 3),
    [orders],
  );

  const addProduct = useCallback(() => {
    if (!storeId) return;
    push(`/store/${storeId}/admin/products?create=1`);
  }, [push, storeId]);

  const openOrder = useCallback(
    (orderId: string) => {
      if (!storeId || !orderId) return;
      push(`/store/${storeId}/admin/orders?orderId=${orderId}`);
    },
    [push, storeId],
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('admin.dashboard')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.addButton, { borderColor: colors.border.primary }]}
          onPress={addProduct}>
          <Text style={[styles.addButtonText, { color: colors.text.primary }]}>הוסף מוצר מהיר</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.kpiRow}>
        <KpiCard
          label="הזמנות היום"
          value={kpis.ordersToday}
          colors={colors}
        />
        <KpiCard
          label="בקשות KYC ממתינות"
          value={kpis.pendingKyc}
          colors={colors}
        />
        <KpiCard
          label={`מלאי נמוך (<${LOW_STOCK_THRESHOLD})`}
          value={kpis.lowStock}
          colors={colors}
        />
      </View>

      {storeId ? (
        <View style={styles.metricsSection}>
          <OrderRevenueMetrics storeId={storeId} />
          <View style={styles.metricSpacer} />
          <FeeDashboard tenantId={storeId} />
        </View>
      ) : null}

      <AdminOnboardingChecklist onAddProduct={addProduct} />

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>הזמנות לטיפול</Text>
      {actionableOrders.length === 0 ? (
        <Text style={{ color: colors.text.secondary }}>אין הזמנות הדורשות פעולה.</Text>
      ) : (
        <View style={styles.bannerColumn}>
          {actionableOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={[styles.orderBanner, { borderColor: colors.border.primary }]}
              onPress={() => openOrder(order.id)}>
              <View style={styles.bannerText}>
                <Text style={[styles.orderId, { color: colors.text.primary }]}>#{order.id}</Text>
                <Text style={{ color: colors.text.secondary }}>{order.status}</Text>
              </View>
              <Text style={{ color: colors.text.secondary }}>
                {new Date(order.createdAt || order.updatedAt || Date.now()).toLocaleString('he-IL')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  colors: any;
}

function KpiCard({ label, value, colors }: KpiCardProps) {
  return (
    <View
      style={[
        styles.kpiCard,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
        },
      ]}>
      <Text style={[styles.kpiValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.text.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '700' },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  addButtonText: { fontSize: 14, fontWeight: '600' },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  kpiValue: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  kpiLabel: { fontSize: 14, textAlign: 'center', marginTop: 4 },
  metricsSection: {
    gap: 12,
  },
  metricSpacer: { height: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  bannerColumn: { gap: 12 },
  orderBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerText: { gap: 4 },
  orderId: { fontSize: 16, fontWeight: '600' },
});
