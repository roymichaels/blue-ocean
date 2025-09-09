import React, { Suspense, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Plus, X, ArrowUpDown, Info } from 'lucide-react-native';
import { Product, HeroBanner, Category } from '@/types';
import { useHome } from '@/features/home/hooks/useHome';
import { useHomeBanners } from '@/features/home/hooks/useHomeBanners';
import { useHomeModals } from '@/features/home/hooks/useHomeModals';
import { useHomeRefresh } from '@/features/home/hooks/useHomeRefresh';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import PriceRange from '@/features/home/components/PriceRange';
import CategoryChips from '@/features/home/components/CategoryChips';
import CTABecomeSeller from '@/features/home/components/CTABecomeSeller';
import BannerArea from '@/features/home/components/BannerArea';
import ProductGrid from '@/features/home/components/ProductGrid';
import CategoryCard from '@/features/home/components/CategoryCard';
import { Spinner } from '@/ui/primitives';
import EmptyState from '@/shared/ui/EmptyState';
import BannerFormModal from '@/components/BannerFormModal';
import { CartModal } from '@/features/cart';
import { ProductFormModal } from '@/features/products';
import InfoModal from '@/components/InfoModal';
import { useHomeFilters, SortOption } from '@/features/home/hooks/useHomeFilters';
import { spacing } from '@/shared/ui/tokens';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import ErrorBoundary from 'src/shared/ErrorBoundary';


function HomeScreenContent() {
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

  const { fallbackCategories, fallbackBanners } = useHomeData();
  const categoriesToShow = categories.length ? categories : fallbackCategories;
  const heroBannersToShow = heroBanners.length ? heroBanners : fallbackBanners;

  const {
    filteredProducts,
    searchQuery,
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
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const handleReload = useCallback(() => {
    closeInfoModal();
    refresh();
  }, [closeInfoModal, refresh]);

  if (error) {
    return (
      <>
        <ScrollArea
          testID="home-root"
          backgroundColor={themeColors.canvas}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
        >
          <EmptyState
            icon={Info}
            title={t('common.error')}
            message={t('home.loadErrorMessage')}
            actionText={t('common.reload')}
            onAction={handleReload}
          />
        </ScrollArea>
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
        <Suspense fallback={<Spinner />}>
          <CartModal visible={showCartModal} onClose={closeCartModal} />
        </Suspense>
      </>
    );
  }

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
      onPress={() => setSelectedCategory(item.id)}
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

  return (
    <>
      <ScrollArea
        testID="home-root"
        backgroundColor={themeColors.canvas}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
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
      <CTABecomeSeller />
      <BannerArea
        heroBanners={heroBannersToShow}
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
              categories={categoriesToShow}
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
          categories={categoriesToShow}
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

      {/* Category Selector Modal */}
      <Modal
        visible={showCategorySelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategorySelector(false)}
      >
        <View
          style={[
            styles.categorySelectorOverlay,
            { backgroundColor: themeColors.background + '80' },
          ]}
        >
          <View
            style={[
              styles.categorySelectorContent,
              {
                backgroundColor: themeColors.surface.elevated,
                borderColor: themeColors.border.primary,
              },
            ]}
          >
            <View style={styles.categorySelectorHeader}>
              <Text
                style={[
                  styles.categorySelectorTitle,
                  { color: themeColors.text.primary },
                ]}
              >
                {t('home.categories')}
              </Text>
              <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                <X size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollArea style={styles.categorySelectorList}>
              <TouchableOpacity
                style={[
                  styles.categorySelectorItem,
                  { borderBottomColor: themeColors.border.secondary },
                  selectedCategory === null && {
                    backgroundColor: themeColors.interactive.secondary,
                  },
                ]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategorySelector(false);
                }}
              >
                <View style={styles.categorySelectorItemContent}>
                  <Text
                    style={[
                      styles.categorySelectorItemText,
                      { color: themeColors.text.primary },
                    ]}
                  >
                    {t('categories.all')}
                  </Text>
                </View>
              </TouchableOpacity>
              {categoriesToShow.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categorySelectorItem,
                    { borderBottomColor: themeColors.border.secondary },
                    selectedCategory === cat.id && {
                      backgroundColor: themeColors.interactive.secondary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setShowCategorySelector(false);
                  }}
                >
                  <View style={styles.categorySelectorItemContent}>
                    <Text style={styles.categorySelectorItemIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categorySelectorItemText,
                        { color: themeColors.text.primary },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.categorySelectorItemId,
                      { color: themeColors.text.secondary },
                    ]}
                  >
                    {cat.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollArea>
          </View>
        </View>
      </Modal>

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

    </>
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
