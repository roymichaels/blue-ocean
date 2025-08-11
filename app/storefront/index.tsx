import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import productsAgent from '../../agents/products-agent';
import reviewAgent from '../../agents/review-agent';
import ProductCard from '../../components/ProductCard';
import { Product } from '../../types';
import Fuse from 'fuse.js';

interface ReviewMap {
  [productId: string]: { rating: number; count: number };
}

interface Props {
  initialCategory?: string;
}

export default function StorefrontScreen({ initialCategory }: Props) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const fuseRef = useRef<Fuse<Product> | null>(null);

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
      setCategories(Array.from(new Set(all.map((p) => p.category))));
      setTags(Array.from(new Set(all.flatMap((p) => p.badges || []))));
      fuseRef.current = new Fuse(all, {
        keys: ['name', 'description', 'badges'],
        threshold: 0.3,
      });
      setFiltered(all);
    };
    load();
  }, []);

  useEffect(() => {
    let result = products;
    if (search.trim() && fuseRef.current) {
      result = fuseRef.current.search(search).map((r) => r.item);
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (selectedTag) {
      result = result.filter((p) => p.badges?.includes(selectedTag));
    }
    setFiltered(result);
  }, [products, search, selectedCategory, selectedTag]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TextInput
        testID="search-input"
        style={[styles.searchInput, { borderColor: colors.border.primary, color: colors.text.primary }]}
        placeholder="Search"
        placeholderTextColor={colors.text.secondary}
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <TouchableOpacity
          testID="category-null"
          style={[styles.chip, { borderColor: colors.border.primary, backgroundColor: selectedCategory === null ? colors.gold : 'transparent' }]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={{ color: selectedCategory === null ? colors.text.inverse : colors.text.primary }}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            testID={`category-${c}`}
            style={[styles.chip, { borderColor: colors.border.primary, backgroundColor: selectedCategory === c ? colors.gold : 'transparent' }]}
            onPress={() => setSelectedCategory(c)}
          >
            <Text style={{ color: selectedCategory === c ? colors.text.inverse : colors.text.primary }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            testID="tag-null"
            style={[styles.chip, { borderColor: colors.border.primary, backgroundColor: selectedTag === null ? colors.gold : 'transparent' }]}
            onPress={() => setSelectedTag(null)}
          >
            <Text style={{ color: selectedTag === null ? colors.text.inverse : colors.text.primary }}>All tags</Text>
          </TouchableOpacity>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              testID={`tag-${tag}`}
              style={[styles.chip, { borderColor: colors.border.primary, backgroundColor: selectedTag === tag ? colors.gold : 'transparent' }]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text style={{ color: selectedTag === tag ? colors.text.inverse : colors.text.primary }}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {filtered.map((p) => (
        <View key={p.id} style={styles.product}>
          <ProductCard product={p} style={{ marginBottom: 4 }} />
          <Text style={{ color: colors.text.secondary, textAlign: 'right' }}>
            ⭐ {reviews[p.id]?.rating.toFixed(1) || '0'} ({reviews[p.id]?.count || 0})
          </Text>
        </View>
      ))}
      {filtered.length === 0 && (
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
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  product: { marginBottom: 12 },
});
