import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { getStore } from '../../../services/tonStores';
import { listProducts } from '../../../services/tonProducts';
import ProductCard from '../../../components/ProductCard';
import { Store, Product } from '../../../types';

export default function StoreProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const [s, all] = await Promise.all([getStore(id), listProducts()]);
      setStore(s);
      setProducts(all.filter((p) => p.storeId === id));
    };
    load();
  }, [id]);

  if (!store) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={{ color: colors.text.primary }}>Store not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profile}>
        <Text style={[styles.storeName, { color: colors.text.primary }]}>
          {store.name}
        </Text>
        <Text style={[styles.storeOwner, { color: colors.text.secondary }]}>
          {store.owner}
        </Text>
      </View>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} style={{ marginBottom: 12 }} />
      ))}
      {products.length === 0 && (
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
          אין מוצרים
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  profile: { marginBottom: 16, alignItems: 'center' },
  storeName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  storeOwner: { fontSize: 16 },
});

