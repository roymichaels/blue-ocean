import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import storesAgent from '../../../agents/stores-agent';
import productsAgent from '../../../agents/products-agent';
import reviewAgent from '../../../agents/review-agent';
import ProductCard from '../../../components/ProductCard';
import { useTheme } from '../../../contexts/ThemeContext';
import { Store, Product } from '../../../types';

interface ReviewMap {
  [productId: string]: { rating: number; count: number };
}

const ITEM_HEIGHT = 150;

export default function StorefrontStoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [score, setScore] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.product}>
      <ProductCard product={item} style={{ marginBottom: 4 }} />
      <Text style={{ color: colors.text.secondary, textAlign: 'end' }}>
        ⭐ {reviews[item.id]?.rating?.toFixed(1) || '0'} ({reviews[item.id]?.count || 0})
      </Text>
    </View>
  );

  useEffect(() => {
    let callback: ((sid: string, s: number) => void) | undefined;
    const load = async () => {
      if (!storeId) return;
      const s = await storesAgent.get(storeId);
      setStore(s);
      setScore(storesAgent.getReputationScore(storeId));
      const all = await productsAgent.getAll();
      const filtered = all.filter((p) => p.storeId === storeId);
      setProducts(filtered);
      const entries = await Promise.all(
        filtered.map(async (p) => {
          const revs = await reviewAgent.getByProduct(p.id);
          const count = revs.length;
          const rating = count > 0 ? revs.reduce((a, r) => a + r.rating, 0) / count : 0;
          return [p.id, { rating, count }] as [string, { rating: number; count: number }];
        })
      );
      const map: ReviewMap = {};
      entries.forEach(([pid, data]) => {
        map[pid] = data;
      });
      setReviews(map);
      callback = (sid: string, sc: number) => {
        if (sid === storeId) setScore(sc);
      };
      storesAgent.subscribe(callback);
    };
    load();
    return () => {
      if (callback) storesAgent.unsubscribe(callback);
    };
  }, [storeId]);

  if (!store) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.text.primary }}>Store not found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={[styles.name, { color: colors.text.primary }]}>{store.name}</Text>
          <Text style={{ color: colors.text.secondary, marginBottom: 16 }}>
            Reputation: {score.toFixed(1)}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
          אין מוצרים זמינים
        </Text>
      }
      contentContainerStyle={styles.content}
      style={[styles.container, { backgroundColor: colors.background }]}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  product: { marginBottom: 12 },
});

