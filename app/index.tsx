import React, { Suspense, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Plus, ArrowUpDown } from 'lucide-react-native';
import { Product } from '@/types';
import { useHome } from '@/features/home/hooks/useHome';
import { useHomeModals } from '@/features/home/hooks/useHomeModals';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import PriceRange from '@/features/home/components/PriceRange';
import CategoryChips from '@/features/home/components/CategoryChips';
import HomeOptions from '@/features/home/components/HomeOptions';
import ProductGrid from '@/features/home/components/ProductGrid';
import CategoryCard from '@/features/home/components/CategoryCard';
import { Spinner, Heading } from '@/ui/primitives';
import EmptyState from '@/shared/ui/EmptyState';
import { CartModal } from '@/features/cart';
import { ProductFormModal } from '@/features/products';
import InfoModal from '@/components/InfoModal';
import { useHomeFilters } from '@/features/home/hooks/useHomeFilters';
import SortModal from '@/features/home/components/SortModal';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { spacing, typography, radius, shadows } from '@/ui/tokens';
import HeroCallout from '@/features/home/components/HeroCallout';
import ErrorBoundary from 'src/shared/ErrorBoundary';
import HomeError from '@/features/home/screens/HomeError';


function HomeScreenContent() {
  const home = useHome();
  const { refreshing, refresh, error } = home;
  const {
    productFormVisible,
    productToEdit,
    openProductForm,
    closeProductForm,
    showCartModal,
    closeCartModal,
    infoModal,
    closeInfoModal,
  } = useHomeModals(error);
  const { isStoreOwner } = useAuth();
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const { products, categories, upsertProduct, removeProduct, loading: productsLoading } = home;

  const { fallbackCategories } = useHomeData();
  const categoriesToShow = categories.length ? categories : fallbackCategories;

  const { filteredProducts, searchQuery, selectedCategory, setSelectedCategory, minPrice, setMinPrice, maxPrice, setMaxPrice, sortBy, setSortBy, showSortModal, setShowSortModal } = useHomeFilters(products);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const { width: windowWidth } = useWindowDimensions();

  const getProductItemWidth = () => {
    if (windowWidth >= 1024) {
      return '23.5%';
    } else if (windowWidth >= 768) {
      return '32%';
    }
    return '48%';
  };

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

  const handleCategoryPress = useCallback(
    (id: string) => setSelectedCategory(id),
    [setSelectedCategory]
  );

  const handleReload = useCallback(() => {
    closeInfoModal();
    refresh();
  }, [closeInfoModal, refresh]);

  if (error) {
    return (
      <HomeError
        refreshing={refreshing}
        refresh={refresh}
        handleReload={handleReload}
        infoModal={infoModal}
        showCartModal={showCartModal}
        closeCartModal={closeCartModal}
      />
    );
  }

  const handleProductSaved = (p: Product, isNew: boolean) => {
    upsertProduct(p, isNew);
  };

  const handleProductDeleted = (id: string) => {
    removeProduct(id);
  };

  return (
    <>
      <ScrollArea
        testID="home-root"
        backgroundColor={themeColors.canvas}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <HeroCallout />
        <CategoryChips
          categories={categoriesToShow}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <PriceRange
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
        />
          <HomeOptions />

        {/* Categories Section */}
        <Container
          style={[
            styles.section,
            { backgroundColor: themeColors.surface.primary },
            Platform.select(shadows.sm),
          ]}
        >
          <Stack direction="horizontal" style={styles.sectionHeader}>
            <Heading size="lg" style={{ color: themeColors.text.primary }}>
              {t('home.categories')}
            </Heading>
            <TouchableOpacity onPress={() => setShowCategorySelector(true)}>
              <Text style={[styles.seeAll, { color: themeColors.gold }]}>
                {t('common.viewAll')}
              </Text>
            </TouchableOpacity>
          </Stack>

          {categoriesToShow.length > 0 ? (
            <ScrollArea
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            >
              {categoriesToShow.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.categoryWrapper}>
                  <CategoryCard
                    category={item}
                    isStoreOwner={isStoreOwner}
                    onPress={() => handleCategoryPress(item.id)}
                    onEdit={() => handleCategoryPress(item.id)}
                  />
                </View>
              ))}
            </ScrollArea>
          ) : (
            <EmptyState
              icon={Plus}
              title={t('home.noCategories')}
              message={t('home.categoriesComingSoon')}
            />
          )}
        </Container>

        {/* Products Section */}
        <Container
          style={[
            styles.section,
            { backgroundColor: themeColors.surface.primary },
            Platform.select(shadows.sm),
          ]}
        >
          <Stack direction="horizontal" style={styles.sectionHeader}>
            <Heading size="lg" style={{ color: themeColors.text.primary }}>
              {searchQuery
                ? t('home.searchResults', { query: searchQuery })
                : t('home.products')}
            </Heading>
            <Stack direction="horizontal" gap="spacer8" style={styles.sectionActions}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: themeColors.surface.primary,
                    borderColor: themeColors.border.primary,
                  },
                ]}
                onPress={() => setShowSortModal(true)}
              >
                <ArrowUpDown size={16} color={themeColors.gold} />
                <Text style={[styles.sortText, { color: themeColors.gold }]}>
                  {getSortLabel()}
                </Text>
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
                  onPress={() => openProductForm()}
                >
                  <Plus size={16} color={themeColors.gold} />
                </TouchableOpacity>
              )}
            </Stack>
          </Stack>

          <Suspense fallback={<Spinner />}>
            <ProductGrid
              products={filteredProducts}
              isStoreOwner={isStoreOwner}
              onEdit={openProductForm}
              getItemWidth={getProductItemWidth}
              searchQuery={searchQuery}
              onAddProduct={openProductForm}
              loading={productsLoading}
            />
          </Suspense>
        </Container>
      </ScrollArea>

      <Suspense fallback={<Spinner />}>
        <ProductFormModal
          visible={productFormVisible}
          onClose={closeProductForm}
          product={productToEdit || undefined}
          onSaved={handleProductSaved}
          onDeleted={handleProductDeleted}
        />
      </Suspense>

      <SortModal
        visible={showSortModal}
        sortBy={sortBy}
        onSelect={(option) => setSortBy(option)}
        onClose={() => setShowSortModal(false)}
      />

      <Suspense fallback={<Spinner />}>
        <InfoModal
          visible={infoModal.visible}
          title={infoModal.title}
          message={infoModal.message}
          type={infoModal.type}
          buttonText={infoModal.buttonText}
          onClose={handleReload}
          autoClose={false}
        />
      </Suspense>

      {/* Cart Modal */}
      <Suspense fallback={<Spinner />}>
        <CartModal
          visible={showCartModal}
          onClose={closeCartModal}
        />
      </Suspense>

    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer24,
    marginBottom: spacing.spacer24,
    borderRadius: radius.lg,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spacer16,
  },
  seeAll: {
    ...typography.sm,
    fontWeight: '600',
  },
  categoriesList: {
    paddingLeft: spacing.spacer16,
  },
  categoryWrapper: {
    marginLeft: spacing.spacer20,
  },
  sectionActions: {
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.spacer12,
    paddingVertical: spacing.spacer8,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  sortText: {
    ...typography.xs,
    fontWeight: '500',
    marginLeft: spacing.spacer4,
  },
  addProductButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <HomeScreenContent />
      </Suspense>
    </ErrorBoundary>
  );
}
