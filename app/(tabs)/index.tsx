import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import { Plus, Pencil, X, ArrowUpDown } from 'lucide-react-native';
import { Product, Category, HeroBanner } from '@/types';
import { useHome } from '@/features/home/hooks/useHome';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import HomeHeader from '@/features/home/components/HomeHeader';
import CategoryTabs from '@/features/home/components/CategoryTabs';
const ProductGrid = lazy(() => import('@/features/home/components/ProductGrid'));
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
const BannerFormModal = lazy(() => import('@/components/BannerFormModal'));
const CartModal = lazy(() => import('@/features/cart/components/CartModal'));
const ProductFormModal = lazy(() => import('@/features/products/components/ProductFormModal'));
const SmartImage = lazy(() => import('@/components/SmartImage'));
const InfoModal = lazy(() => import('@/components/InfoModal'));
import { useHomeScreen, SortOption } from '@/features/home/hooks/useHomeScreen';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;
const BANNER_HEIGHT = (BANNER_WIDTH * 9) / 16;

function HomeScreenContent() {
  const { push } = useAppRouter();
  const params = useLocalSearchParams<{ showCart?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const {
    products,
    categories,
    heroBanners,
    refreshing,
    refresh,
    upsertBanner,
    removeBanner,
    upsertProduct,
    removeProduct,
    error,
  } = useHome();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
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
  const bannerScrollRef = useRef<ScrollView>(null);

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
  } = useHomeScreen(products);

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
    // Auto-scroll banner for web compatibility
    if (heroBanners.length > 1) {
      const bannerInterval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % heroBanners.length;
          bannerScrollRef.current?.scrollTo({
            x: nextIndex * (width - 32),
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);

      return () => clearInterval(bannerInterval);
    }
  }, [heroBanners.length]);

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

  const renderBanner = (item: HeroBanner, index: number) => (
    <View key={item.id} style={styles.heroBanner}>
      <TouchableOpacity
        style={styles.bannerTouchable}
        onPress={() => push(`/category/${item.category}`)}
      >
        <Suspense fallback={<Spinner />}>
          <SmartImage
            uri={item.image}
            width={BANNER_WIDTH}
            height={BANNER_HEIGHT}
            contentFit="cover"
          />
        </Suspense>
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            {item.discount ? (
              <Text
                style={[
                  styles.heroDiscount,
                  {
                    color: colors.text.inverse,
                    backgroundColor: colors.gold,
                  },
                ]}
              >
                {item.discount} הנחה
              </Text>
            ) : null}
            <Text style={[styles.heroTitle, { color: colors.gold }]}>
              {item.title}
            </Text>

            <Text style={[styles.heroSubtitle, { color: colors.gold }]}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {isStoreOwner && (
        <View style={styles.bannerAdminActions}>
          <TouchableOpacity
            style={styles.bannerAdminButton}
            onPress={() => editBanner(item)}
          >
            <Pencil size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
    <HomeHeader
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />

    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
        />
        <TouchableOpacity
          style={[styles.becomeSellerButton, { backgroundColor: colors.gold }]}
          onPress={() => push('/stores/create')}
          accessibilityRole="link"
        >
          <Text style={[styles.becomeSellerText, { color: colors.text.inverse }]}>Become a Seller</Text>
        </TouchableOpacity>
        {/* Hero Banner Carousel */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerHeader}>
            {isStoreOwner && (
              <TouchableOpacity
                style={[
                  styles.addBannerButton,
                  { backgroundColor: colors.gold },
                ]}
                onPress={addBanner}
              >
                <Plus size={20} color={colors.text.inverse} />
                <Text
                  style={[styles.addBannerText, { color: colors.text.inverse }]}
                >
                  {t('banner.addBanner')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {heroBanners.length > 0 ? (
            <>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / (width - 32)
                  );
                  setCurrentBannerIndex(newIndex);
                }}
                contentContainerStyle={styles.bannerScrollContent}
              >
                {heroBanners.map((item, index) => renderBanner(item, index))}
              </ScrollView>

              {/* Banner Indicators */}
              {heroBanners.length > 1 && (
                <View style={styles.bannerIndicators}>
                  {heroBanners.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        index === currentBannerIndex && [
                          styles.activeIndicator,
                          { backgroundColor: colors.gold },
                        ],
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <EmptyState
              icon={Plus}
              title={t('home.noBanners')}
              message={
                isStoreOwner ? t('home.addBanners') : t('home.bannersComingSoon')
              }
              actionText={isStoreOwner ? t('banner.addBanner') : undefined}
              onAction={isStoreOwner ? addBanner : undefined}
            />
          )}
        </View>

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

          <Suspense fallback={<Spinner />}>
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
            { backgroundColor: 'rgba(0,0,0,0.5)' },
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
  becomeSellerButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  becomeSellerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bannerContainer: {
    height: BANNER_HEIGHT + 40,
    marginBottom: 24,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  addBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBannerText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bannerScrollContent: {
    paddingHorizontal: 16,
  },
  heroBanner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerTouchable: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 13, 10, 0.4)',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  heroDiscount: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'end',
  },
  heroSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'end',
  },
  bannerAdminActions: {
    position: 'absolute',
    top: 8,
    start: 8,
    flexDirection: 'row',
  },
  bannerAdminButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  bannerIndicators: {
    position: 'absolute',
    bottom: 16,
    start: 0,
    end: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
    paddingLeft: 16,
  },
  categoryWrapper: {
    marginLeft: 20,
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
    marginBottom: 8,
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
    textAlign: 'end',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'end',
  },
  adminActionsContainer: {
    padding: 16,
    marginBottom: 24,
  },
  clearDataButton: {
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearDataText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  categorySelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categorySelectorText: {
    fontSize: 16,
    textAlign: 'end',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  categorySelectorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySelectorItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categorySelectorItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categorySelectorItemId: {
    fontSize: 12,
  },
  buttonSpinner: {
    marginRight: 8,
  },
});
