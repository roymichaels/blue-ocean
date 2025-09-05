import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter, useProducts } from '@/services';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import OrderRevenueMetrics from '@/features/stores/components/OrderRevenueMetrics';
import { useAuth } from '@/features/auth/AuthContext';
import { useStore } from '@/features/products';
import { routes } from '@/utils/routes';

export default function StoreDashboardScreen() {
  const { replace, push } = useAppRouter();
  const { storeId, impersonate } = useLocalSearchParams<{ storeId: string; impersonate?: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [productCount, setProductCount] = useState(0);
  const [authorized, setAuthorized] = useState(false);
  const { data: store } = useStore(storeId);
  const { data: products = [] } = useProducts(storeId || '');

  useEffect(() => {
    if (!storeId || !store) return;
    const isAdmin = impersonate === 'true' && user?.role === 'platform-admin';
    if (store.owner !== user?.address && !isAdmin) {
      replace(routes.store(storeId));
      return;
    }
    setAuthorized(true);
    setProductCount(products.filter((p) => p.storeId === storeId).length);
  }, [storeId, store, user?.address, products]);
  

  if (!authorized) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('admin.dashboard')}</Text>
      <View style={styles.stats}>
        <Text style={[styles.statText, { color: colors.text.primary }]}>
          {t('admin.productCount', { count: productCount })}
        </Text>
        {storeId && <OrderRevenueMetrics storeId={storeId} />}
      </View>
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border.primary }]}
          onPress={() => push(routes.storeAdminProducts(storeId))}
        >
          <Text style={{ color: colors.text.primary }}>{t('admin.manageProducts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border.primary }]}
          onPress={() => push(routes.storeAdminOrders(storeId))}
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

