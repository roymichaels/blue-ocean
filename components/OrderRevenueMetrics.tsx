import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { listOrdersBySeller } from '../services/tonOrders';
import { Order } from '../types';

interface Props {
  sellerId: string;
}

export default function OrderRevenueMetrics({ sellerId }: Props) {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!sellerId) return;
      const list = await listOrdersBySeller(sellerId);
      setOrders(list);
    };
    load();
  }, [sellerId]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.stat, { color: colors.text.primary }]}>Orders: {totalOrders}</Text>
      <Text style={[styles.stat, { color: colors.text.primary }]}>Revenue: {totalRevenue.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end', gap: 4 },
  stat: { fontSize: 16 },
});
