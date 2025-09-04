import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/ui/ThemeProvider';
import StoreHeader from '@/features/stores/components/store/StoreHeader';
import StoreTabs from '@/features/stores/components/store/StoreTabs';
import ProductGrid from '@/features/products/components/ProductGrid';
import { useStoreData } from '@/services/useStoreData';

export default function StorefrontStoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const { store, products, score } = useStoreData(storeId);
  const [tab, setTab] = useState<'products' | 'about' | 'reviews'>('products');

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

