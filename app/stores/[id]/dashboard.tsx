import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { listProducts } from '../../../services/tonProducts';
import { listOrdersBySeller } from '../../../services/tonOrders';

export default function StoreDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      if (!id) return;
      const products = await listProducts();
      setProductCount(products.filter((p) => p.storeId === id).length);
      const orders = await listOrdersBySeller(id);
      setOrderCount(orders.length);
    };
    loadStats();
  }, [id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>לוח חנות</Text>
      <View style={styles.stats}>
        <Text style={[styles.statText, { color: colors.text.primary }]}>מוצרים: {productCount}</Text>
        <Text style={[styles.statText, { color: colors.text.primary }]}>הזמנות: {orderCount}</Text>
      </View>
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border.primary }]}
          onPress={() => router.push(`/stores/${id}/products`)}
        >
          <Text style={{ color: colors.text.primary }}>ניהול מוצרים</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border.primary }]}
          onPress={() => router.push(`/stores/${id}/orders`)}
        >
          <Text style={{ color: colors.text.primary }}>צפייה בהזמנות</Text>
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

