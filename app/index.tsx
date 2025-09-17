// TOUCHPOINT: app/index.tsx renders in production — Fix Pack v2
import React, { Suspense, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { useTenant } from '@/contexts/TenantContext';
import { useAppInfo } from '@/contexts/AppInfoContext';
import SmartImage from '@/components/SmartImage';
import PromoCard from '@/features/home/components/PromoCard';
import PriceRange from '@/features/home/components/PriceRange';
import CategoryChips from '@/features/home/components/CategoryChips';
import HomeOptions from '@/features/home/components/HomeOptions';
import ProductGrid from '@/features/home/components/ProductGrid';
import FeaturedStoresCarousel from '@/features/home/components/FeaturedStoresCarousel';
import CategoryCard from '@/features/home/components/CategoryCard';
import SearchBar from '@/features/home/components/SearchBar';
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
import AdminOnboardingChecklist from '@/features/home/components/AdminOnboardingChecklist';
import { useAppRouter } from '@/services/useAppRouter';
import eventBus from '@/services/eventBus';
import { localIndex } from '@/services/localIndex';
import { isReviewsEnabled } from '@/config/featureFlags';

// TODO:TODO-126 Split HomeScreenContent into route-level chunks so bundle size stays manageable on low-end devices.
// TODO:REC-226 Prefetch personalization data during warm start to reduce spinner time when resuming the app.
function HomeScreenContent() {
  const { tenantId, isNetwork } = useTenant();
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const { appName, logoCid } = useAppInfo();
  const { width: windowWidth } = useWindowDimensions();
  const appRouter = useAppRouter();
  const reviewsEnabled = isReviewsEnabled();

  const home = useHome(tenantId);

  const refreshing = home?.refreshing ?? false;
  const refresh = home?.refresh ?? (() => {});
  const error = home?.error ?? null;
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
  const products = home?.products ?? [];
  const categories = home?.categories ?? [];
  const upsertProduct = home?.upsertProduct ?? ((_: any) => {});
  const removeProduct = home?.removeProduct ?? ((_: any) => {});
  const productsLoading = home?.loading ?? false;

  const { fallbackCategories, fallbackBanners } = useHomeData();
  const categoriesToShow = categories.length ? categories : fallbackCategories;

  const {
    filteredProducts,
    searchQuery,
    setSearchQuery,
    applySearchResults,
    selectedCategory,
    setSelectedCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sortBy,
    setSortBy,
    showSortModal,
    setShowSortModal,
  } = useHomeFilters(products);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRunRef = useRef(0);
  const latestSearchValueRef = useRef(searchQuery);

  useEffect(() => {
    void eventBus.track('view.home');
  }, []);

  useEffect(() => {
    latestSearchValueRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      latestSearchValueRef.current = value;

      const invoke = async () => {
        const queryText = latestSearchValueRef.current;
        void eventBus.track('search.query', { query: queryText });
        try {
          const result = await localIndex.query(queryText);
          applySearchResults(queryText, result);
        } catch {
          applySearchResults(queryText, {
            products: [...products],
            total: products.length,
          });
        }
      };

      const now = Date.now();
      const elapsed = now - lastSearchRunRef.current;
      const wait = 150;

      if (elapsed >= wait) {
        lastSearchRunRef.current = now;
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
        void invoke();
      } else if (!searchTimeoutRef.current) {
        searchTimeoutRef.current = setTimeout(() => {
          lastSearchRunRef.current = Date.now();
          searchTimeoutRef.current = null;
          void invoke();
        }, wait - elapsed);
      }
    },
    [applySearchResults, products, setSearchQuery],
  );

  const getProductItemWidth = () => {
    if (windowWidth >= 1024) {
      return '23.5%';
    }
    if (windowWidth >= 768) {
      return '32%';
    }
    return '48%';
  };

  const handleProductPress = useCallback(
    (product: Product) => {
      const store = product.storeId || tenantId;
      if (!store) return;
      appRouter.push(`/store/${store}/product/${product.id}`);
    },
    [appRouter, tenantId],
  );

  const getSortLabel = () => {
    switch (sortBy) {
      case 'price-low':
        return t('home.priceLowHigh');
      case 'price-high':
        return t('home.priceHighLow');
      case 'rating':
        return reviewsEnabled ? t('home.highRating') : t('common.comingSoon', 'Coming Soon');
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

  const renderRefreshControl = () => {
    try {
      // Some tests mock react-native without RefreshControl; guard its usage.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RefreshControl } = require('react-native');
      if (RefreshControl) {
        return (
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        );
      }
    } catch {}
    return undefined;
  };

  // DOCME: network-only home options
  if (isNetwork) {
    return (
      <ScrollArea
        testID="home-root"
        backgroundColor={themeColors.canvas}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.spacer24 }}
        style={[{ flex: 1 }]}
      >
        <Container style={{ paddingVertical: spacing.spacer16 }}>
          <HeroCallout />
          <View style={{ height: spacing.spacer16 }} />
          <HomeOptions />
          <View style={{ height: spacing.spacer16 }} />
          <AdminOnboardingChecklist onAddProduct={() => openProductForm()} />
        </Container>
      </ScrollArea>
    );
  }

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
        refreshControl={renderRefreshControl()}
        style={[{ flex: 1 }]}
      >
        {tenantId && (
          <PromoCard
            backgroundColor={themeColors.surface.primary}
            icon={
              logoCid ? (
                <SmartImage
                  uri={logoCid}
                  width={60}
                  height={60}
                  contentFit="contain"
                />
              ) : undefined
            }
            title={appName}
            style={{ marginHorizontal: spacing.spacer16, marginBottom: spacing.spacer16 }}
          />
        )}
        {!categories.length && (
          <PromoCard
            backgroundColor={themeColors.surface.primary}
            title={fallbackBanners?.[0]?.title}
            subtitle={fallbackBanners?.[0]?.subtitle}
            style={{ marginHorizontal: spacing.spacer16, marginBottom: spacing.spacer16 }}
          />
        )}
        <CategoryChips
          tenantId={tenantId}
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
        <View style={{ height: spacing.spacer16 }} />
        <AdminOnboardingChecklist onAddProduct={() => openProductForm()} />
        <View style={{ height: spacing.spacer16 }} />
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
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
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

        <FeaturedStoresCarousel />

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

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />

          <Suspense fallback={<Spinner />}>
            <ProductGrid
              tenantId={tenantId}
              products={filteredProducts}
              isStoreOwner={isStoreOwner}
              onEdit={openProductForm}
              getItemWidth={getProductItemWidth}
              searchQuery={searchQuery}
              onAddProduct={openProductForm}
              loading={productsLoading}
              onProductPress={handleProductPress}
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

// AC: Cards are 4-wide on md+; on mobile they scroll horizontally with snap; hero no longer overlaps; page has no white bottom.
