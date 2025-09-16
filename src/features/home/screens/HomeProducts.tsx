import React, { Suspense, useCallback } from 'react';
import { Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { ArrowUpDown, Plus } from 'lucide-react-native';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Container, Stack } from '@/ui/layout';
import { Spinner } from '@/ui/primitives';
import ProductGrid from '@/features/home/components/ProductGrid';
import HomeServices from '@/features/home/components/HomeServices';
import { Product } from '@/types';
import { styles } from './HomeProducts.styles';
import { useAppRouter } from '@/services/useAppRouter';

type Props = {
  products: Product[];
  searchQuery: string;
  isStoreOwner: boolean;
  loading: boolean;
  sortBy: string;
  onSortPress: () => void;
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
};

export default function HomeProducts({
  products,
  searchQuery,
  isStoreOwner,
  loading,
  sortBy,
  onSortPress,
  onAddProduct,
  onEditProduct,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const appRouter = useAppRouter();

  const getProductItemWidth = () => {
    if (windowWidth >= 1024) {
      return '23.5%';
    } else if (windowWidth >= 768) {
      return '32%';
    }
    return '48%';
  };

  const handleProductPress = useCallback(
    (product: Product) => {
      if (!product.storeId) return;
      appRouter.push(`/store/${product.storeId}/product/${product.id}`);
    },
    [appRouter],
  );

  const getSortLabel = () => {
    switch (sortBy) {
      case 'price-low':
        return t('home.priceLowHigh');
      case 'price-high':
        return t('home.priceHighLow');
      case 'rating':
        return t('home.highRating');
      case 'newest':
      default:
        return t('home.newest');
    }
  };

  return (
    <>
      <HomeServices />
      <Container style={styles.section}>
        <Stack direction="horizontal" style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}> 
            {searchQuery ? t('home.searchResults', { query: searchQuery }) : t('home.products')}
          </Text>
          <Stack direction="horizontal" gap="spacer8" style={styles.sectionActions}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                {
                  backgroundColor: themeColors.surface.primary,
                  borderColor: themeColors.border.primary,
                },
              ]}
              onPress={onSortPress}
            >
              <ArrowUpDown size={16} color={themeColors.gold} />
              <Text style={[styles.sortText, { color: themeColors.gold }]}>{getSortLabel()}</Text>
            </TouchableOpacity>
            {isStoreOwner && (
              <TouchableOpacity
                style={[
                  styles.addProductButton,
                  {
                    backgroundColor: themeColors.interactive.secondary,
                    borderColor: themeColors.gold,
                  },
                ]}
                onPress={onAddProduct}
              >
                <Plus size={16} color={themeColors.gold} />
              </TouchableOpacity>
            )}
          </Stack>
        </Stack>
        <Suspense fallback={<Spinner />}>
          <ProductGrid
            products={products}
            isStoreOwner={isStoreOwner}
            onEdit={onEditProduct}
            getItemWidth={getProductItemWidth}
            searchQuery={searchQuery}
            onAddProduct={onAddProduct}
            loading={loading}
            onProductPress={handleProductPress}
          />
        </Suspense>
      </Container>
    </>
  );
}
