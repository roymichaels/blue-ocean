import React, { Suspense, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { Plus, X, ArrowUpDown, Info } from 'lucide-react-native';
import { Product, HeroBanner, Category } from '@/types';
import { RefreshControl } from 'react-native';
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
import StoreCreation from '@/features/stores/components/StoreCreation';
import BannerArea from '@/features/home/components/BannerArea';
import ProductGrid from '@/features/home/components/ProductGrid';
import CategoryCard from '@/features/home/components/CategoryCard';
import { Spinner } from '@/ui/primitives';
import BannerFormModal from '@/components/BannerFormModal';
import { CartModal } from '@/features/cart';
import { ProductFormModal } from '@/features/products';
import InfoModal from '@/components/InfoModal';
import { useHomeFilters } from '@/features/home/hooks/useHomeFilters';
import SortModal from '@/features/home/components/SortModal';
import { ScrollArea } from '@/ui/layout';
import ErrorBoundary from 'src/shared/ErrorBoundary';
import HomeBanners from '@/features/home/screens/HomeBanners';
import HomeCategories from '@/features/home/screens/HomeCategories';
import HomeProducts from '@/features/home/screens/HomeProducts';
import HomeAdminActions from '@/features/home/screens/HomeAdminActions';
import HomeError from '@/features/home/screens/HomeError';


function HomeScreenContent() {
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
    storeCreationVisible,
    openStoreCreation,
    closeStoreCreation,
    infoModal,
    closeInfoModal,
  } = useHomeModals(error);
  const { isStoreOwner } = useAuth();
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();

  const { products, categories, upsertProduct, removeProduct, loading: productsLoading } = home;

  const { heroBanners, upsertBanner, removeBanner, loading: bannersLoading } = banners;

  const { fallbackCategories, fallbackBanners } = useHomeData();
  const categoriesToShow = categories.length ? categories : fallbackCategories;
  const heroBannersToShow = heroBanners.length ? heroBanners : fallbackBanners;

  const { filteredProducts, searchQuery, selectedCategory, setSelectedCategory, minPrice, setMinPrice, maxPrice, setMaxPrice, sortBy, setSortBy, showSortModal, setShowSortModal } = useHomeFilters(products);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

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
      <CTABecomeSeller onPress={openStoreCreation} />
      <BannerArea
        heroBanners={heroBannersToShow}
        isStoreOwner={isStoreOwner}
        onAddBanner={openBannerForm}
        onEditBanner={openBannerForm}
        loading={bannersLoading}
        onSelectCategory={setSelectedCategory}
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

      <Suspense fallback={<Spinner />}>
        <Modal
          visible={storeCreationVisible}
          animationType="slide"
          onRequestClose={closeStoreCreation}
        >
          <StoreCreation />
        </Modal>
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
