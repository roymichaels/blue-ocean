import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/services';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import OrderRevenueMetrics from '@/features/stores/components/OrderRevenueMetrics';
import FeeDashboard from '@/features/billing/components/FeeDashboard';
import { useAuth } from '@/features/auth/AuthContext';
import { getStore as getNearStore } from '@/features/stores/services/nearStores';
import { listProducts as listNearProducts } from '@/features/products/services/nearProducts';
import { routes } from '@/utils/routes';
import { Spinner } from '@/ui/primitives';
import AdminOnboardingChecklist from '@/features/home/components/AdminOnboardingChecklist';

export default function StoreDashboardScreen() {
  console.debug('SD: mount');
  const { replace, push } = useAppRouter();
  const { storeId, impersonate } = useLocalSearchParams<{ storeId: string; impersonate?: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [productCount, setProductCount] = useState(0);
  const [authorized, setAuthorized] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleOpenProducts = useCallback(() => {
    if (!storeId) return;
    push(`/store/${storeId}/admin/products`);
  }, [push, storeId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!storeId) return;
      try {
        console.debug('SD: fetch store', storeId);
        const s = await getNearStore(storeId, storeId);
        if (active) setStore(s);
      } catch {
        // ignore
      }
      try {
        console.debug('SD: fetch products', storeId);
        const ps = await listNearProducts(storeId);
        if (active) setProducts(ps || []);
      } catch {
        // ignore
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (!storeId || !store) return;
    const isAdmin = impersonate === 'true' && user?.role === 'platform-admin';
    if (store.owner !== user?.address && !isAdmin) {
      replace(routes.store(storeId));
      return;
    }
    setAuthorized(true);
    setProductCount(products.filter((p) => p.storeId === storeId).length);
  }, [storeId, store, user?.address, products, impersonate]);
  

  if (!authorized) {
    console.debug('SD: not authorized yet');
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('admin.dashboard')}</Text>
      <AdminOnboardingChecklist onAddProduct={handleOpenProducts} />
      <View style={{ height: 16 }} />
      <View style={styles.stats}>
        <Text style={[styles.statText, { color: colors.text.primary }]}>
          {t('admin.productCount', { count: productCount })}
        </Text>
        {storeId && <OrderRevenueMetrics storeId={storeId} />}
      </View>
      {storeId && <FeeDashboard tenantId={storeId} />}
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border.primary }]}
          onPress={() => push(`/store/${storeId}/admin/products`)}
        >
          <Text style={{ color: colors.text.primary }}>{t('admin.manageProducts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border.primary }]}
          onPress={() => push(`/store/${storeId}/admin/orders`)}
        >
          <Text style={{ color: colors.text.primary }}>{t('admin.viewOrders')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 24, textAlign: 'right' },
  stats: { marginBottom: 24, gap: 8, alignItems: 'flex-end' },
  statText: { fontSize: 16 },
  nav: { gap: 12 },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
});

