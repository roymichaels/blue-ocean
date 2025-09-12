import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/ui/ThemeProvider';
import StoreHeader from '@/features/stores/components/store/StoreHeader';
import StoreTabs from '@/features/stores/components/store/StoreTabs';
import { ProductGrid } from '@/features/products';
import { useProducts, useCategories, useStoreReviews } from '@/services';
import { selectStore } from '@/agents/stores-agent';
import type { Store } from '@/types';

export default function StoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const { data: products = [] } = useProducts(storeId);
  const { data: _categories = [] } = useCategories(storeId);
  const { data: { score } = { score: 0 } } = useStoreReviews(storeId);
  const [tab, setTab] = useState<'products' | 'about' | 'reviews'>('products');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!storeId) return;
      const s = await selectStore(storeId);
      if (active) setStore(s);
    };
    void load();
    return () => {
      active = false;
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
            Decentralized store on NEAR. Owner-managed with P2P updates via Waku.
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

