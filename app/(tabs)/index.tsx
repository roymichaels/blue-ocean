import React, { Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useAppRouter } from '@/services';
import { Plus, X, ArrowUpDown } from 'lucide-react-native';
import { Product, Category, HeroBanner } from '@/types';
import { useHome } from '@/features/home/hooks/useHome';
import { useHomeBanners } from '@/features/home/hooks/useHomeBanners';
import { useHomeModals } from '@/features/home/hooks/useHomeModals';
import { useHomeRefresh } from '@/features/home/hooks/useHomeRefresh';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import PriceRange from '@/features/home/components/PriceRange';
import CategoryChips from '@/features/home/components/CategoryChips';
import CTABecomeSeller from '@/features/home/components/CTABecomeSeller';
import BannerArea from '@/features/home/components/BannerArea';
const ProductGrid = lazy(() => import('@/features/home/components/ProductGrid'));
import { Spinner } from '@/ui/primitives';
import EmptyState from '@/shared/ui/EmptyState';
import ErrorBoundary from '@/shared/ErrorBoundary';
const BannerFormModal = lazy(() => import('@/components/BannerFormModal'));
const CartModal = lazy(() =>
  import('@/features/cart').then((m) => ({ default: m.CartModal }))
);
const ProductFormModal = lazy(() =>
  import('@/features/products').then((m) => ({ default: m.ProductFormModal }))
);
const InfoModal = lazy(() => import('@/components/InfoModal'));
import { useHomeFilters, SortOption } from '@/features/home/hooks/useHomeFilters';
import { spacing } from '@/shared/ui/tokens';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { routes } from '@/utils/routes';
import AppShell from '@/components/layout/AppShell';


function HomeScreenContent() {
  const { push } = useAppRouter();
  const { width: windowWidth } = useWindowDimensions();
  const home = useHome();
  const banners = useHomeBanners();
  const { refreshing, refresh, error } = useHomeRefresh(home, banners);
  const {
    bannerFormVisible,
    editingBanner,
    openBannerForm,
    closeBannerForm,
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

  const {
    products,
    categories,
    upsertProduct,
    removeProduct,
    loading: productsLoading,
  } = home;

  const {
    heroBanners,
    upsertBanner,
    removeBanner,
    loading: bannersLoading,
  } = banners;

  const {
    filteredProducts,
    searchQuery,
    setSearchQuery,
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

  // Fallback content to guarantee a rich homepage even with empty services
  const fallbackCategories: Category[] = [
    { id: 'electronics', name: t('categories.electronics'), icon: String.fromCodePoint(0x1F4F1) } as any,
    { id: 'fashion', name: t('categories.fashion'), icon: String.fromCodePoint(0x1F457) } as any,
    { id: 'home', name: t('categories.home'), icon: String.fromCodePoint(0x1F3E0) } as any,
    { id: 'beauty', name: t('categories.beauty'), icon: String.fromCodePoint(0x1F484) } as any,
    { id: 'sports', name: t('categories.sports'), icon: String.fromCodePoint(0x1F3C0) } as any,
    { id: 'books', name: t('categories.books'), icon: String.fromCodePoint(0x1F4DA) } as any,
  ];
  const fallbackBanners: Partial<HeroBanner & { id: string }>[] = [
    {
      id: 'b1',
      image: '',
      title: t('home.fallbackBanner1Title'),
      subtitle: t('home.fallbackBanner1Subtitle'),
    },
    {
      id: 'b2',
      image: '',
      title: t('home.fallbackBanner2Title'),
      subtitle: t('home.fallbackBanner2Subtitle'),
    },
  ];
  const handleBannerSaved = (b: HeroBanner, isNew: boolean) => {
    upsertBanner(b, isNew);
  };

  const handleBannerDeleted = (id: string) => {
    removeBanner(id);
  };

  const handleProductSaved = (p: Product, isNew: boolean) => {
    upsertProduct(p, isNew);
  };

  const handleProductDeleted = (id: string) => {
    removeProduct(id);
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard]}
      onPress={() => push(routes.category(item.id))}
    >
      <View
        style={[
          styles.categoryIcon,
          {
            backgroundColor: themeColors.interactive.secondary,
            borderColor: themeColors.gold,
          },
        ]}
      >
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: themeColors.text.primary }]}>
        {item.name}
      </Text>
      {isStoreOwner && (
        <View style={styles.categoryAdminActions}>
          <TouchableOpacity
            style={[
              styles.categoryAdminButton,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.gold,
              },
            ]}
            onPress={() => push(routes.category(item.id))}
          >
            <Pencil size={10} color={themeColors.gold} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  // Function to determine product item width based on screen size
  const getProductItemWidth = () => {
    if (windowWidth >= 1024) {
      // Large screens - 4 columns with spacing
      return '23.5%'; // 4 columns with small gap
    } else if (windowWidth >= 768) {
      // Medium screens - 3 columns with spacing
      return '32%'; // 3 columns with small gap
    } else {
      // Small screens - 2 columns with spacing
      return '48%'; // 2 columns with small gap
    }
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

  const handleReload = () => {
    closeInfoModal();
    refresh();
  };

  return (
    <AppShell
      showSearch
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <ScrollArea
        testID="home-root"
        backgroundColor={themeColors.canvas}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
      <CategoryChips
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <PriceRange
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
        />
      <CTABecomeSeller />
      <BannerArea
        heroBanners={heroBanners}
        isStoreOwner={isStoreOwner}
        onAddBanner={openBannerForm}
        onEditBanner={openBannerForm}
        loading={bannersLoading}
      />

        {/* Categories Section */}
        <Container style={styles.section}>
          <Stack direction="horizontal" style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              {t('home.categories')}
            </Text>
            <TouchableOpacity onPress={() => push('/categories')}>
              <Text style={[styles.seeAll, { color: themeColors.gold }]}>
                {t('common.viewAll')}
              </Text>
            </TouchableOpacity>
          </Stack>

          {categories.length > 0 ? (
            <ScrollArea
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            >
              {categories.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.categoryWrapper}>
                  {renderCategory({ item })}
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
        <Container style={styles.section}>
          <Stack direction="horizontal" style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              {searchQuery
                ? t('home.searchResults', { query: searchQuery })
                : t('home.products')}
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
                    onPress={openProductForm}
                >
                  <Plus size={16} color={themeColors.gold} />
                </TouchableOpacity>
              )}
            </Stack>
          </Stack>

          <Suspense fallback={<Spinner />}>
            <ProductGrid
              products={filteredProducts}
              categories={categories}
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
        <BannerFormModal
          visible={bannerFormVisible}
          onClose={closeBannerForm}
          banner={editingBanner || undefined}
          categories={categories}
          onSaved={handleBannerSaved}
          onDeleted={handleBannerDeleted}
        />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <ProductFormModal
          visible={productFormVisible}
          onClose={closeProductForm}
          product={productToEdit || undefined}
          onSaved={handleProductSaved}
          onDeleted={handleProductDeleted}
        />
      </Suspense>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <View
          style={[
            styles.sortModalOverlay,
            { backgroundColor: themeColors.background + '80' },
          ]}
        >
          <View
            style={[
              styles.sortModalContent,
              {
                backgroundColor: themeColors.surface.elevated,
                borderColor: themeColors.border.primary,
              },
            ]}
          >
            <View style={styles.sortModalHeader}>
              <Text
                style={[styles.sortModalTitle, { color: themeColors.text.primary }]}
              >
                {t('home.sortProducts')}
              </Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            {[
              { key: 'newest', label: t('home.newest') },
              { key: 'price-low', label: t('home.priceLowHigh') },
              { key: 'price-high', label: t('home.priceHighLow') },
              { key: 'rating', label: t('home.highRating') },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  { borderBottomColor: themeColors.border.secondary },
                  sortBy === option.key && [
                    styles.selectedSortOption,
                    { backgroundColor: themeColors.interactive.secondary },
                  ],
                ]}
                onPress={() => {
                  setSortBy(option.key as SortOption);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: themeColors.text.primary },
                    sortBy === option.key && { color: themeColors.gold },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <View
                    style={[
                      styles.selectedDot,
                      { backgroundColor: themeColors.gold },
                    ]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
    </AppShell>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <HomeScreenContent />
      </Suspense>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spacer16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionActions: {
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.spacer12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.spacer4,
  },
  addProductButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  categoriesList: {
    paddingLeft: spacing.spacer16,
  },
  categoryWrapper: {
    marginLeft: spacing.spacer20,
  },
  categoryCard: {
    alignItems: 'center',
    width: 70,
    position: 'relative',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spacer8,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryAdminActions: {
    position: 'absolute',
    top: -4,
    start: -4,
    flexDirection: 'row',
  },
  categoryAdminButton: {
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
    borderWidth: 1,
  },
  sortModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  selectedSortOption: {
    borderRadius: 12,
  },
  sortOptionText: {
    fontSize: 16,
    textAlign: 'right',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  helperText: {
    fontSize: 12,
    marginTop: spacing.spacer4,
    textAlign: 'right',
  },
  adminActionsContainer: {
    padding: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  clearDataButton: {
    borderRadius: 12,
    paddingVertical: spacing.spacer12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearDataText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.spacer8,
  },
  categorySelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer12,
  },
  categorySelectorText: {
    fontSize: 16,
    textAlign: 'right',
  },
  categorySelectorOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  categorySelectorContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  categorySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categorySelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categorySelectorList: {
    maxHeight: 400,
  },
  categorySelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    borderBottomWidth: 1,
  },
  categorySelectorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySelectorItemIcon: {
    fontSize: 24,
    marginRight: spacing.spacer12,
  },
  categorySelectorItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categorySelectorItemId: {
    fontSize: 12,
  },
  buttonSpinner: {
    marginRight: spacing.spacer8,
  },
});
