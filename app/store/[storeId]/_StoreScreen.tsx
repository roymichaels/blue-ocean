import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import StoreHeader from '@/features/stores/components/store/StoreHeader';
import StoreTabs from '@/features/stores/components/store/StoreTabs';
import { ProductGrid, ProductCardSkeleton } from '@/features/products';
import CategoryChips from '@/features/home/components/CategoryChips';
import { useProducts, useCategories, useStoreReviews } from '@/services';
import { selectStore } from '@/agents/stores-agent';
import type { Store } from '@/types';
import { spacing } from '@/shared/ui/tokens';
import EmptyState from '@/shared/ui/EmptyState';
import { Info } from 'lucide-react-native';
import { useAppRouter } from '@/services/useAppRouter';

export default function StoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [store, setStore] = useState<Store | null>(null);
  const appRouter = useAppRouter();
  const {
    data: products = [],
    isLoading: productsLoading,
  } = useProducts(storeId);
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useCategories(storeId);
  const { data: { score } = { score: 0 } } = useStoreReviews(storeId);
  const [tab, setTab] = useState<'products' | 'about' | 'reviews'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((p) => p.category === selectedCategory)
        : products,
    [products, selectedCategory],
  );

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

  // DOCME: store not-found i18n
  if (!store) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          icon={Info}
          title=""
          message={t('stores.notFound')}
          actionText={t('common.backToHome')}
          onAction={() => appRouter.replace('/')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StoreHeader
        name={store.name}
        reputation={score}
        bannerUri={(store as any).bannerUri}
        avatarUri={(store as any).avatarUri}
        tagline={(store as any).tagline}
      />
      <StoreTabs active={tab} onChange={setTab} />
      {tab === 'products' && (
        <>
          {!!categories.length && !categoriesLoading && (
            <CategoryChips
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          )}
          {productsLoading ? (
            <View style={styles.productsGrid}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <View key={idx} style={styles.productWrapper}>
                  <ProductCardSkeleton />
                </View>
              ))}
            </View>
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </>
      )}
      {tab === 'about' && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('stores.about')}
          </Text>
          <Text
            style={[
              styles.sectionText,
              { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('stores.aboutDescription')}
          </Text>
        </View>
      )}
      {tab === 'reviews' && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionText,
              { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('stores.reviewsComingSoon')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.spacer24 },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer16,
  },
  productWrapper: { width: '48%', marginBottom: spacing.spacer16 },
  section: { padding: spacing.spacer16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.spacer8,
  },
  sectionText: {},
});

