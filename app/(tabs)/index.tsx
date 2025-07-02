import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  Alert,
  I18nManager,
  TextInput,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Heart, Plus, Pencil, X, Save, Trash2, Filter, ArrowUpDown } from 'lucide-react-native';
import DatabaseService from '../../services/database';
import PinataService from '../../services/pinata';
import { Product, Category, HeroBanner } from '../../types';
import { useAuth } from '../../components/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import GlobalHeader from '../../components/GlobalHeader';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import MediaUploader from '../../components/MediaUploader';
import CartModal from '../../components/CartModal';
import ProductFormModal from '../../components/ProductFormModal';

// Enable RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { width } = Dimensions.get('window');

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
}

export default function HomeScreen() {
  const params = useLocalSearchParams<{ showCart?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [newBanner, setNewBanner] = useState<Partial<HeroBanner>>({
    title: '',
    subtitle: '',
    image: '',
    discount: '',
    category: '',
    isActive: true,
    order: 1
  });
  const [bannerMedia, setBannerMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const bannerScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, []);

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
            animated: true 
          });
          return nextIndex;
        });
      }, 5000);

      return () => clearInterval(bannerInterval);
    }
  }, [heroBanners.length]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const [productsData, categoriesData, bannersData] = await Promise.all([
        db.getProducts(),
        db.getCategories(),
        db.getHeroBanners()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setHeroBanners(bannersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filterAndSortProducts = () => {
    let filtered = products;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort products
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    setFilteredProducts(filtered);
  };

  const addBanner = () => {
    setEditingBanner(null);
    setNewBanner({
      title: '',
      subtitle: '',
      image: '',
      discount: '',
      category: '',
      isActive: true,
      order: heroBanners.length + 1
    });
    setBannerMedia([]);
    setShowBannerModal(true);
  };

  const editBanner = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setNewBanner({...banner});
    // Convert existing image to media format
    setBannerMedia(banner.image ? [{
      id: '1',
      uri: banner.image,
      type: 'image',
      name: 'banner_image'
    }] : []);
    setShowBannerModal(true);
  };

  const saveBanner = async () => {
    if (!newBanner.title || !newBanner.subtitle || !newBanner.discount || !newBanner.category) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    if (bannerMedia.length === 0) {
      Alert.alert('שגיאה', 'Please upload a banner image');
      return;
    }

    try {
      setLoading(true);
      const pinata = PinataService.getInstance();
      const uploadedUrl = await pinata.uploadFile(bannerMedia[0].uri, 'banner');

      if (!uploadedUrl ||
          (uploadedUrl === bannerMedia[0].uri &&
           !bannerMedia[0].uri.startsWith('http'))) {
        Alert.alert('שגיאה', 'העלאת הבאנר נכשלה');
        return;
      }

      const db = DatabaseService.getInstance();
      const bannerData = {
        ...newBanner,
        image: uploadedUrl
      };
      
      if (editingBanner) {
        // Update existing banner
        await db.updateHeroBanner(editingBanner.id, bannerData);
        setHeroBanners(prev => prev.map(b => b.id === editingBanner.id ? {...b, ...bannerData} : b));
      } else {
        // Add new banner
        const bannerId = await db.addHeroBanner(bannerData as Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>);
        const addedBanner = {
          ...bannerData, 
          id: bannerId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as HeroBanner;
        setHeroBanners(prev => [...prev, addedBanner]);
      }
      
      setShowBannerModal(false);
      Alert.alert('הצלחה', 'הבאנר נשמר בהצלחה');
    } catch (error) {
      console.error('Error saving banner:', error);
      Alert.alert('שגיאה', 'שמירת הבאנר נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async () => {
    if (!editingBanner) return;

    Alert.alert(
      'אישור מחיקה',
      'האם אתה בטוח שברצונך למחוק את הבאנר?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const db = DatabaseService.getInstance();
              await db.deleteHeroBanner(editingBanner.id);
              setHeroBanners(prev => prev.filter(b => b.id !== editingBanner.id));
              setShowBannerModal(false);
              Alert.alert('הצלחה', 'הבאנר נמחק בהצלחה');
            } catch (error) {
              console.error('Error deleting banner:', error);
              Alert.alert('שגיאה', 'מחיקת הבאנר נכשלה');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const addProduct = () => {
    setProductToEdit(null);
    setProductFormVisible(true);
  };

  const editProduct = (product: Product) => {
    setProductToEdit(product);
    setProductFormVisible(true);
  };

  const selectCategory = (category: string) => {
    if (showBannerModal) {
      setNewBanner({ ...newBanner, category });
    }
    setShowCategorySelector(false);
  };

  const handleProductSaved = (p: Product, isNew: boolean) => {
    if (isNew) {
      setProducts(prev => [...prev, p]);
    } else {
      setProducts(prev => prev.map(prod => (prod.id === p.id ? p : prod)));
    }
  };

  const handleProductDeleted = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      }]}
      onPress={() => router.push(`/category/${item.id}`)}
    >
      <View style={[styles.categoryIcon, { 
        backgroundColor: colors.interactive.secondary,
        borderColor: colors.gold 
      }]}>
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: colors.text.primary }]}>{item.name}</Text>
      {isAdmin && (
        <View style={styles.categoryAdminActions}>
          <TouchableOpacity 
            style={[styles.categoryAdminButton, { 
              backgroundColor: colors.background,
              borderColor: colors.gold 
            }]}
            onPress={() => router.push(`/category/${item.id}`)}
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
        onPress={() => router.push(`/category/${item.category}`)}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <Text style={[styles.heroDiscount, { 
              color: colors.text.inverse,
              backgroundColor: colors.gold 
            }]}>{item.discount} הנחה</Text>
            <Text style={[styles.heroTitle, { color: colors.text.inverse }]}>{item.title}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.text.inverse }]}>{item.subtitle}</Text>
          </View>
        </View>
      </TouchableOpacity>
      
      {isAdmin && (
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
      case 'price-low': return t('home.priceLowHigh');
      case 'price-high': return t('home.priceHighLow');
      case 'rating': return t('home.highRating');
      case 'newest':
      default: return t('home.newest');
    }
  };

      

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={true}
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={true}
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Banner Carousel */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerHeader}>
            {isAdmin && (
              <TouchableOpacity 
                style={[styles.addBannerButton, { backgroundColor: colors.gold }]}
                onPress={addBanner}
              >
                <Plus size={20} color={colors.text.inverse} />
                <Text style={[styles.addBannerText, { color: colors.text.inverse }]}>{t('banner.addBanner')}</Text>
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
                        index === currentBannerIndex && [styles.activeIndicator, { backgroundColor: colors.gold }]
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
              message={isAdmin ? t('home.addBanners') : t('home.bannersComingSoon')}
              actionText={isAdmin ? t('banner.addBanner') : undefined}
              onAction={isAdmin ? addBanner : undefined}
            />
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('home.categories')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
              <Text style={[styles.seeAll, { color: colors.gold }]}>{t('common.viewAll')}</Text>
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
              {searchQuery ? t('home.searchResults', { query: searchQuery }) : t('home.products')}
            </Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity 
                style={[styles.sortButton, { 
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary 
                }]}
                onPress={() => setShowSortModal(true)}
              >
                <ArrowUpDown size={16} color={colors.gold} />
                <Text style={[styles.sortText, { color: colors.gold }]}>{getSortLabel()}</Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity 
                  style={[styles.addProductButton, { 
                    backgroundColor: colors.interactive.secondary,
                    borderColor: colors.gold 
                  }]}
                  onPress={addProduct}
                >
                  <Plus size={16} color={colors.gold} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {filteredProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {filteredProducts.map((item) => (
                <View 
                  key={item.id} 
                  style={[
                    styles.productWrapper,
                    { width: getProductItemWidth() }
                  ]}
                >
                  <ProductCard
                    product={item}
                    isAdmin={isAdmin}
                    onEdit={editProduct}
                  />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={searchQuery ? Filter : Plus}
              title={searchQuery ? t('home.noResults') : t('home.noProducts')}
              message={searchQuery ? t('home.tryDifferentSearch') : t('home.productsComingSoon')}
              actionText={isAdmin && !searchQuery ? 'הוסף מוצר' : undefined}
              onAction={isAdmin && !searchQuery ? addProduct : undefined}
            />
          )}
        </View>

      </ScrollView>

      {/* Banner Edit/Add Modal */}
      <Modal
        visible={showBannerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowBannerModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { 
            borderBottomColor: colors.border.primary 
          }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingBanner ? t('banner.editBanner') : t('banner.addNewBanner')}
            </Text>
            <TouchableOpacity onPress={() => setShowBannerModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <MediaUploader
              media={bannerMedia}
              onMediaChange={setBannerMedia}
              maxFiles={1}
              allowVideos={false}
            />

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>כותרת *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newBanner.title}
                onChangeText={(text) => setNewBanner({...newBanner, title: text})}
                placeholder="הכנס כותרת באנר"
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>כותרת משנה *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newBanner.subtitle}
                onChangeText={(text) => setNewBanner({...newBanner, subtitle: text})}
                placeholder="הכנס כותרת משנה"
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>הנחה *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newBanner.discount}
                onChangeText={(text) => setNewBanner({...newBanner, discount: text})}
                placeholder="למשל: 50% או חדש"
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>קטגוריה *</Text>
              <TouchableOpacity 
                style={[styles.categorySelector, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary 
                }]}
                onPress={() => setShowCategorySelector(true)}
              >
                <Text style={[
                  styles.categorySelectorText,
                  { color: newBanner.category ? colors.text.primary : colors.text.tertiary }
                ]}>
                  {newBanner.category || "בחר קטגוריה"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveBanner}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="small" color={colors.text.inverse} style={styles.buttonSpinner} />
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור באנר</Text>
                  </>
                )}
              </TouchableOpacity>

              {editingBanner && (
                <TouchableOpacity 
                  style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                  onPress={deleteBanner}
                  disabled={loading}
                >
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק באנר</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <ProductFormModal
        visible={productFormVisible}
        onClose={() => setProductFormVisible(false)}
        product={productToEdit || undefined}
        onSaved={handleProductSaved}
        onDeleted={handleProductDeleted}
      />

      {/* Category Selector Modal */}
      <Modal
        visible={showCategorySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategorySelector(false)}
      >
        <View style={[styles.categorySelectorOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.categorySelectorContent, { 
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.categorySelectorHeader}>
              <Text style={[styles.categorySelectorTitle, { color: colors.text.primary }]}>בחר קטגוריה</Text>
              <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categorySelectorList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary }]}
                  onPress={() => selectCategory(category.id)}
                >
                  <View style={styles.categorySelectorItemContent}>
                    <Text style={styles.categorySelectorItemIcon}>{category.icon}</Text>
                    <Text style={[styles.categorySelectorItemText, { color: colors.text.primary }]}>{category.name}</Text>
                  </View>
                  <Text style={[styles.categorySelectorItemId, { color: colors.text.tertiary }]}>{category.id}</Text>
                </TouchableOpacity>
              ))}
              
              {/* Add new category option */}
              <TouchableOpacity
                style={[styles.categorySelectorItem, { 
                  borderBottomColor: colors.border.secondary,
                  backgroundColor: colors.interactive.secondary
                }]}
                onPress={() => {
                  setShowCategorySelector(false);
                  router.push('/(tabs)/categories');
                }}
              >
                <View style={styles.categorySelectorItemContent}>
                  <Plus size={20} color={colors.gold} />
                  <Text style={[styles.categorySelectorItemText, { color: colors.gold }]}>הוסף קטגוריה חדשה</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
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
        <View style={[styles.sortModalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.sortModalContent, { 
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.sortModalHeader}>
              <Text style={[styles.sortModalTitle, { color: colors.text.primary }]}>מיון מוצרים</Text>
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
                  sortBy === option.key && [styles.selectedSortOption, { backgroundColor: colors.interactive.secondary }]
                ]}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  { color: colors.text.primary },
                  sortBy === option.key && { color: colors.gold }
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <View style={[styles.selectedDot, { backgroundColor: colors.gold }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Cart Modal */}
      <CartModal 
        visible={showCartModal} 
        onClose={() => setShowCartModal(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerContainer: {
    height: 220,
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
    width: width - 32,
    height: 180,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerTouchable: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right',
  },
  bannerAdminActions: {
    position: 'absolute',
    top: 8,
    left: 8,
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
    left: 0,
    right: 0,
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
    left: -4,
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
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productWrapper: {
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    marginTop: 4,
    textAlign: 'right',
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
  emptySubcategories: {
    padding: 20,
    alignItems: 'center',
  },
  emptySubcategoriesText: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonSpinner: {
    marginRight: 8,
  },
});