import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  I18nManager,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import productsAgent from '../../agents/products-agent';
import reviewAgent from '../../agents/review-agent';
import ProductCard from '../../components/ProductCard';
import { Product } from '../../types';
import Fuse from 'fuse.js';
import eventBus from '../../services/eventBus';

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
  const CARD_HEIGHT = 220;

  useEffect(() => {
    eventBus.track('catalog.view', { category: initialCategory || null });
  }, [initialCategory]);

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

  const renderHeader = () => (
    <>
      <TextInput
        testID="search-input"
        style={[styles.searchInput, { borderColor: colors.border.primary, color: colors.text.primary }]}
        placeholder="Search"
        placeholderTextColor={colors.text.secondary}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        horizontal
        data={[null, ...categories]}
        keyExtractor={(item) => item ?? 'all'}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`category-${item ?? 'null'}`}
            style={[
              styles.chip,
              {
                borderColor: colors.border.primary,
                backgroundColor: selectedCategory === item ? colors.gold : 'transparent',
              },
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={{ color: selectedCategory === item ? colors.text.inverse : colors.text.primary }}>
              {item === null ? 'All' : item}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      />
      {tags.length > 0 && (
        <FlatList
          horizontal
          data={[null, ...tags]}
          keyExtractor={(item) => item ?? 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`tag-${item ?? 'null'}`}
              style={[
                styles.chip,
                {
                  borderColor: colors.border.primary,
                  backgroundColor: selectedTag === item ? colors.gold : 'transparent',
                },
              ]}
              onPress={() => setSelectedTag(item)}
            >
              <Text style={{ color: selectedTag === item ? colors.text.inverse : colors.text.primary }}>
                {item === null ? 'All tags' : item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        />
      )}
    </>
  );

  const renderItem = ({ item: p }: { item: Product }) => (
    <View style={styles.product}>
      <ProductCard product={p} style={{ marginBottom: 4 }} />
      <Text style={{ color: colors.text.secondary, textAlign: 'end' }}>
        ⭐ {reviews[p.id]?.rating.toFixed(1) || '0'} ({reviews[p.id]?.count || 0})
      </Text>
    </View>
  );

  const getItemLayout = (_data: any, index: number) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  });

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={() => (
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
          אין מוצרים זמינים
        </Text>
      )}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { direction: I18nManager.isRTL ? 'rtl' : 'ltr' },
      ]}
      initialNumToRender={8}
      windowSize={5}
      getItemLayout={getItemLayout}
    />
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
