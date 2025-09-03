import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import { Plus, X, ArrowUpDown } from 'lucide-react-native';
import { Product, Category, HeroBanner } from '@/types';
import { useHome } from '@/features/home/hooks/useHome';
import { useHomeBanners } from '@/features/home/hooks/useHomeBanners';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import HomeHeader from '@/features/home/components/HomeHeader';
import SearchBar from '@/features/home/components/SearchBar';
import PriceRange from '@/features/home/components/PriceRange';
import CategoryChips from '@/features/home/components/CategoryChips';
import CTABecomeSeller from '@/features/home/components/CTABecomeSeller';
import BannerArea from '@/features/home/components/BannerArea';
import BannerAreaSkeleton from '@/features/home/components/BannerAreaSkeleton';
const ProductGrid = lazy(() => import('@/features/home/components/ProductGrid'));
import ProductGridSkeleton from '@/features/home/components/ProductGridSkeleton';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
const BannerFormModal = lazy(() => import('@/components/BannerFormModal'));
const CartModal = lazy(() => import('@/features/cart/components/CartModal'));
const ProductFormModal = lazy(() => import('@/features/products/components/ProductFormModal'));
const InfoModal = lazy(() => import('@/components/InfoModal'));
import { useHomeFilters, SortOption } from '@/features/home/hooks/useHomeFilters';
import { spacing } from '@/shared/ui/tokens';


function HomeScreenContent() {
  const { push } = useAppRouter();
  const params = useLocalSearchParams<{ showCart?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const {
    products,
    categories,
    refreshing: dataRefreshing,
    refresh: refreshData,
    upsertProduct,
    removeProduct,
    error: dataError,
    loading: productsLoading,
  } = useHome();
  const {
    heroBanners,
    refreshing: bannersRefreshing,
    refresh: refreshBanners,
    upsertBanner,
    removeBanner,
    error: bannersError,
    loading: bannersLoading,
  } = useHomeBanners();
  const refreshing = dataRefreshing || bannersRefreshing;
  const refresh = async () => {
    await Promise.all([refreshData(), refreshBanners()]);
  };
  const error = dataError || bannersError;
  const [bannerFormVisible, setBannerFormVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    buttonText: undefined as string | undefined,
  });
  const { isStoreOwner } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();

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
    { id: 'electronics', name: 'Electronics', icon: '📱' } as any,
    { id: 'fashion', name: 'Fashion', icon: '👗' } as any,
    { id: 'home', name: 'Home', icon: '🏠' } as any,
    { id: 'beauty', name: 'Beauty', icon: '💄' } as any,
    { id: 'sports', name: 'Sports', icon: '🏀' } as any,
    { id: 'books', name: 'Books', icon: '📚' } as any,
  ];
  const fallbackBanners: Partial<HeroBanner & { id: string }>[] = [
    { id: 'b1', image: '', title: 'Welcome to Blue Ocean', subtitle: 'Own your store on NEAR' },
    { id: 'b2', image: '', title: 'Decentralized by design', subtitle: 'Fast, P2P and secure' },
  ];

  useEffect(() => {
    // Check if we should show the cart modal from URL params
    if (params.showCart === 'true') {
      setShowCartModal(true);
    }
  }, [params.showCart]);

  useEffect(() => {
    if (error) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('home.loadErrorMessage'),
        type: 'error',
        buttonText: t('common.reload'),
      });
    }
  }, [error, t]);


  const addBanner = () => {
    setEditingBanner(null);
    setBannerFormVisible(true);
  };

  const editBanner = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setBannerFormVisible(true);
  };

  const handleBannerSaved = (b: HeroBanner, isNew: boolean) => {
    upsertBanner(b, isNew);
  };

  const handleBannerDeleted = (id: string) => {
    removeBanner(id);
  };

  const addProduct = () => {
    setProductToEdit(null);
    setProductFormVisible(true);
  };

  const editProduct = (product: Product) => {
    setProductToEdit(product);
    setProductFormVisible(true);
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
      onPress={() => push(`/category/${item.id}`)}
    >
      <View
        style={[
          styles.categoryIcon,
          {
            backgroundColor: colors.interactive.secondary,
            borderColor: colors.gold,
          },
        ]}
      >
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: colors.text.primary }]}>
        {item.name}
      </Text>
      {isStoreOwner && (
        <View style={styles.categoryAdminActions}>
          <TouchableOpacity
            style={[
              styles.categoryAdminButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.gold,
              },
            ]}
            onPress={() => push(`/category/${item.id}`)}
          >
            <Pencil size={10} color={colors.gold} />
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
    setInfoModal((prev) => ({ ...prev, visible: false }));
    refresh();
  };

  return (
    <SafeAreaView
      testID="home-root"
      style={[styles.container, { backgroundColor: colors.canvas }]}
    >
    <HomeHeader />
    <SearchBar
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />

    <ScrollView
      style={{ backgroundColor: colors.canvas }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
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
      {bannersLoading ? (
        <BannerAreaSkeleton />
      ) : (
        <BannerArea
          heroBanners={heroBanners}
          isStoreOwner={isStoreOwner}
          onAddBanner={addBanner}
          onEditBanner={editBanner}
        />
      )}

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {t('home.categories')}
            </Text>
            <TouchableOpacity onPress={() => push('/categories')}>
              <Text style={[styles.seeAll, { color: colors.gold }]}>
                {t('common.viewAll')}
              </Text>
            </TouchableOpacity>
          </View>

          {categories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            >
              {categories.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.categoryWrapper}>
                  {renderCategory({ item })}
                </View>
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              icon={Plus}
              title={t('home.noCategories')}
              message={t('home.categoriesComingSoon')}
            />
          )}
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {searchQuery
                ? t('home.searchResults', { query: searchQuery })
                : t('home.products')}
            </Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: colors.surface.primary,
                    borderColor: colors.border.primary,
                  },
                ]}
                onPress={() => setShowSortModal(true)}
              >
                <ArrowUpDown size={16} color={colors.gold} />
                <Text style={[styles.sortText, { color: colors.gold }]}>
                  {getSortLabel()}
                </Text>
              </TouchableOpacity>
              {isStoreOwner && (
                <TouchableOpacity
                  style={[
                    styles.addProductButton,
                    {
                      backgroundColor: colors.interactive.secondary,
                      borderColor: colors.gold,
                    },
                  ]}
                  onPress={addProduct}
                >
                  <Plus size={16} color={colors.gold} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {productsLoading ? (
            <ProductGridSkeleton />
          ) : (
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid
                products={filteredProducts}
                categories={categories}
                isStoreOwner={isStoreOwner}
                onEdit={editProduct}
                getItemWidth={getProductItemWidth}
                searchQuery={searchQuery}
                onAddProduct={addProduct}
              />
            </Suspense>
          )}
        </View>
      </ScrollView>

      <Suspense fallback={<Spinner />}>
        <BannerFormModal
          visible={bannerFormVisible}
          onClose={() => setBannerFormVisible(false)}
          banner={editingBanner || undefined}
          categories={categories}
          onSaved={handleBannerSaved}
          onDeleted={handleBannerDeleted}
        />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <ProductFormModal
          visible={productFormVisible}
          onClose={() => setProductFormVisible(false)}
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
            { backgroundColor: colors.background + '80' },
          ]}
        >
          <View
            style={[
              styles.sortModalContent,
              {
                backgroundColor: colors.surface.elevated,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <View style={styles.sortModalHeader}>
              <Text
                style={[styles.sortModalTitle, { color: colors.text.primary }]}
              >
                מיון מוצרים
              </Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={24} color={colors.text.primary} />
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
                  { borderBottomColor: colors.border.secondary },
                  sortBy === option.key && [
                    styles.selectedSortOption,
                    { backgroundColor: colors.interactive.secondary },
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
                    { color: colors.text.primary },
                    sortBy === option.key && { color: colors.gold },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <View
                    style={[
                      styles.selectedDot,
                      { backgroundColor: colors.gold },
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
          onClose={() => setShowCartModal(false)}
        />
      </Suspense>
    </SafeAreaView>
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
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spacer16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spacer8,
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
