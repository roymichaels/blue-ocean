import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { chainAdapter } from '@/services/chain';
import { Order } from '@/types';

interface Props {
  storeId: string;
}

export default function OrderRevenueMetrics({ storeId }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!storeId || !chainAdapter.listOrdersBySeller) return;
      const list = await chainAdapter.listOrdersBySeller(storeId, storeId);
      setOrders(list);
    };
    load();
  }, [storeId]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.stat, { color: colors.text.primary }]}> 
        {t('stores.metrics.orders')} {totalOrders}
      </Text>
      <Text style={[styles.stat, { color: colors.text.primary }]}> 
        {t('stores.metrics.revenue')} {totalRevenue.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end', gap: 4 },
  stat: { fontSize: 16 },
});
