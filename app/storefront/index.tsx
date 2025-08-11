import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import productsAgent from '../../agents/products-agent';
import reviewAgent from '../../agents/review-agent';
import ProductCard from '../../components/ProductCard';
import { Product } from '../../types';

interface ReviewMap {
  [productId: string]: { rating: number; count: number };
}

export default function StorefrontScreen() {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});

  useEffect(() => {
    const load = async () => {
      const all = await productsAgent.getAll();
      setProducts(all);
      const entries = await Promise.all(
        all.map(async (p) => {
          const revs = await reviewAgent.getByProduct(p.id);
          const count = revs.length;
          const rating = count > 0 ? revs.reduce((a, r) => a + r.rating, 0) / count : 0;
          return [p.id, { rating, count }] as [string, { rating: number; count: number }];
        })
      );
      const map: ReviewMap = {};
      entries.forEach(([id, data]) => {
        map[id] = data;
      });
      setReviews(map);
    };
    load();
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {products.map((p) => (
        <View key={p.id} style={styles.product}>
          <ProductCard product={p} style={{ marginBottom: 4 }} />
          <Text style={{ color: colors.text.secondary, textAlign: 'right' }}>
            ⭐ {reviews[p.id]?.rating.toFixed(1) || '0'} ({reviews[p.id]?.count || 0})
          </Text>
        </View>
      ))}
      {products.length === 0 && (
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
          אין מוצרים זמינים
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  product: { marginBottom: 12 },
});
