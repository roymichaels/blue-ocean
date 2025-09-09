import React, { Suspense, useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { Product, HeroBanner } from '@/types';
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
  const { bannerFormVisible, editingBanner, openBannerForm, closeBannerForm, productFormVisible, productToEdit, openProductForm, closeProductForm, showCartModal, closeCartModal, infoModal, closeInfoModal } = useHomeModals(error);
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
        <CTABecomeSeller />
        <HomeBanners
          banners={heroBannersToShow}
          isStoreOwner={isStoreOwner}
          onAddBanner={openBannerForm}
          onEditBanner={openBannerForm}
          loading={bannersLoading}
        />
        <HomeCategories
          categories={categoriesToShow}
          isStoreOwner={isStoreOwner}
          onSelectCategory={setSelectedCategory}
          onViewAll={() => setShowCategorySelector(true)}
        />
        <HomeProducts
          products={filteredProducts}
          categories={categoriesToShow}
          searchQuery={searchQuery}
          isStoreOwner={isStoreOwner}
          loading={productsLoading}
          sortBy={sortBy}
          onSortPress={() => setShowSortModal(true)}
          onAddProduct={openProductForm}
          onEditProduct={openProductForm}
        />
        <HomeAdminActions onClearData={() => {}} />
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
