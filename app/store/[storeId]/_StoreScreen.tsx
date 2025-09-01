import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import storesAgent, { selectStore } from '../../../agents/stores-agent';
import { getProducts } from '../../../agents/products-agent';
import reviewAgent from '../../../agents/review-agent';
import { useTheme } from '../../../contexts/ThemeContext';
import { Store, Product } from '../../../types';
import StoreHeader from '@/features/stores/components/store/StoreHeader';
import StoreTabs from '@/features/stores/components/store/StoreTabs';
import ProductGrid from '@/features/products/components/ProductGrid';

interface ReviewMap {
  [productId: string]: { rating: number; count: number };
}

export default function StorefrontStoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [score, setScore] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [tab, setTab] = useState<'products' | 'about' | 'reviews'>('products');

  useEffect(() => {
    let callback: ((sid: string, s: number) => void) | undefined;
    const load = async () => {
      if (!storeId) return;
      const s = await selectStore(storeId);
      setStore(s);
      setScore(storesAgent.getReputationScore(storeId));
      const all = await getProducts();
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StoreHeader name="Store not found" reputation={0} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StoreHeader name={store.name} reputation={score} />
      <StoreTabs active={tab} onChange={setTab} />
      {tab === 'products' && <ProductGrid products={products} />}
      {tab === 'about' && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            About this store
          </Text>
          <Text style={{ color: colors.text.secondary }}>
            Decentralized storefront on NEAR. Owner-managed with P2P updates via Waku.
          </Text>
        </View>
      )}
      {tab === 'reviews' && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text.secondary }}>Reviews coming soon.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
});

