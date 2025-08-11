import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { getStore } from '../../../services/tonStores';
import ProductCard from '../../../components/ProductCard';
import { Store, Product } from '../../../types';
import productsAgent from '../../../agents/products-agent';
import moderationAgent from '../../../agents/moderation-agent';
import { Shield } from 'lucide-react-native';

export default function StoreProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeRating, setStoreRating] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const [s, all] = await Promise.all([getStore(id), productsAgent.getAll()]);
      setStore(s);
      const owned = all.filter((p) => p.storeId === id);
      setProducts(owned);
      const summaries = await Promise.all(
        owned.map((p) => productsAgent.getSummary(p.id))
      );
      const count = summaries.reduce((acc, s) => acc + s.reviews, 0);
      const total = summaries.reduce(
        (acc, s) => acc + s.rating * s.reviews,
        0
      );
      const avg = count > 0 ? total / count : 0;
      setStoreRating({ avg, count });
    };
    load();
  }, [id]);

  const handleReport = async () => {
    if (!store) return;
    try {
      await moderationAgent.reportStore(store.id, 'inappropriate');
      Alert.alert('Report sent', 'Thank you for your feedback');
    } catch (err) {
      Alert.alert('Error', 'Failed to send report');
    }
  };

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
        <View style={styles.ratingRow}>
          <Text style={[styles.rating, { color: colors.text.primary }]}>⭐ {storeRating.avg.toFixed(1)}</Text>
          <Text style={[styles.reviews, { color: colors.text.tertiary }]}>({storeRating.count})</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.reportButton,
            { borderColor: colors.status.error, backgroundColor: colors.surface.primary },
          ]}
          onPress={handleReport}
        >
          <Shield size={16} color={colors.status.error} />
          <Text style={[styles.reportButtonText, { color: colors.status.error }]}>Report Store</Text>
        </TouchableOpacity>
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rating: { fontSize: 14, fontWeight: '500' },
  reviews: { fontSize: 14, marginLeft: 4 },
  reportButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  reportButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

