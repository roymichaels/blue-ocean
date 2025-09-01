import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import { ArrowLeft, Plus, Pencil, X, Save, Trash2, Heart } from 'lucide-react-native';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, Subcategory, Category, PricingTier, Store } from '@/types';

let listStores: (() => Promise<Store[]>) | undefined;
if (chain === 'near') {
  ({ listStores } = require('@/features/stores/services/nearStores'));
}
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import MediaUploader from '@/components/MediaUploader';
import Spinner from '@/components/ui/Spinner';
import InfoModal from '@/components/InfoModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import commonStyles from '@/constants/styles';
import Card from '@/components/Card';
import SmartImage from '@/components/SmartImage';

const validateParams = createValidateParams(z.object({ id: z.string() }));

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 8) / 2;
const IMAGE_HEIGHT = 140;


interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
}

export default function SubcategoryScreen() {
  const { push, back } = useAppRouter();
  const params = validateParams(useLocalSearchParams());
  const id = params.success ? params.data.id : undefined;
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    description: '',
    category: '',
    subcategory: '',
    images: [],
    videos: [],
    stock: 0,
    rating: 0,
    reviews: 0,
    badges: [],
    pricingTier: 'standard'
  });
  const [productMedia, setProductMedia] = useState<MediaItem[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showSubcategorySelector, setShowSubcategorySelector] = useState(false);
  const [showPricingTierSelector, setShowPricingTierSelector] = useState(false);
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [showSubcategoryEditModal, setShowSubcategoryEditModal] = useState(false);
  const [editSubcategoryData, setEditSubcategoryData] = useState<Partial<Subcategory>>({name: "", icon: ""});
  const { isStoreOwner, user } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (!id) return;
    loadSubcategoryData();
    loadPricingTiers();
  }, [id]);

  useEffect(() => {
    const loadStore = async () => {
      if (!user?.address || !listStores) return;
      try {
        const stores = await listStores();
        const store = stores.find((s) => s.owner === user.address);
        if (store) setStoreId(store.id);
      } catch (err) {
        errorLog('Failed to load store for user', err);
      }
    };
    loadStore();
  }, [user?.address]);

  useEffect(() => {
    // When category changes, update available subcategories
    if (newProduct.category) {
      const selectedCategory = categories.find(c => c.id === newProduct.category);
      if (selectedCategory && selectedCategory.subcategories) {
        setAvailableSubcategories(selectedCategory.subcategories);
      } else {
        setAvailableSubcategories([]);
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [newProduct.category, categories]);

  if (!params.success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <Text style={{ color: colors.text.primary }}>Invalid subcategory</Text>
      </SafeAreaView>
    );
  }

  const loadSubcategoryData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const [categoriesData, productsData] = await Promise.all([
        db.getCategories(),
        db.getProducts()
      ]);

      setCategories(categoriesData);

      // Find the subcategory
        let foundSubcategory: Subcategory | null = null;
        for (const category of categoriesData) {
          if (category.subcategories) {
          foundSubcategory =
            category.subcategories.find(sub => sub.id === id) || null;
          if (foundSubcategory) {
            // Set default category for new products
            setNewProduct(prev => ({...prev, category: category.id, subcategory: foundSubcategory?.id || ''}));
            break;
          }
        }
      }

      setSubcategory(foundSubcategory);

      // Filter products by subcategory
      const filteredProducts = productsData.filter(product => product.subcategory === id);
      setProducts(filteredProducts);
    } catch (error) {
      errorLog('Error loading subcategory data:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת נתוני תת-הקטגוריה נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPricingTiers = async () => {
    try {
      const db = DatabaseService.getInstance();
      const tiers = await db.getPricingTiers();
      setPricingTiers(tiers);
    } catch (error) {
      errorLog('Error loading pricing tiers:', error);
    }
  };

  const addProduct = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '',
      price: 0,
      originalPrice: undefined,
      description: '',
      category: subcategory?.categoryId || '',
      subcategory: id || '',
      images: [],
      videos: [],
      stock: 0,
      rating: 0,
      reviews: 0,
      badges: [],
      pricingTier: 'standard'
    });
    setProductMedia([]);
    setShowProductModal(true);
  };

  const openEditSubcategory = () => {
    if (!subcategory) return;
    setEditSubcategoryData({ name: subcategory.name, icon: subcategory.icon });
    setShowSubcategoryEditModal(true);
  };

  const saveSubcategoryChanges = async () => {
    if (!subcategory) return;
    if (!editSubcategoryData.name || !editSubcategoryData.icon) {
      setInfoModal({ visible: true, title: "שגיאה", message: "אנא מלא את כל השדות", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.updateSubcategory(subcategory.id, editSubcategoryData);
      await loadSubcategoryData();
      setShowSubcategoryEditModal(false);
      setInfoModal({ visible: true, title: "הצלחה", message: "תת-הקטגוריה עודכנה בהצלחה", type: "success" });
    } catch (error) {
      errorLog("Error updating subcategory:", error);
      setInfoModal({ visible: true, title: "שגיאה", message: "עדכון תת-הקטגוריה נכשל", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const deleteCurrentSubcategory = async () => {
    if (!subcategory) return;
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deleteSubcategory(subcategory.id);
      setShowSubcategoryEditModal(false);
      setInfoModal({ visible: true, title: "הצלחה", message: "תת-הקטגוריה נמחקה בהצלחה", type: "success" });
      back();
    } catch (error) {
      errorLog("Error deleting subcategory:", error);
      setInfoModal({ visible: true, title: "שגיאה", message: "מחיקת תת-הקטגוריה נכשלה", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({...product});
    // Convert existing images and videos to media format
    const media: MediaItem[] = [];
    
    product.images?.forEach((uri, index) => {
      media.push({
        id: `image_${index}`,
        uri,
        type: 'image',
        name: `Image ${index + 1}`
      });
    });
    
    product.videos?.forEach((uri, index) => {
      media.push({
        id: `video_${index}`,
        uri,
        type: 'video',
        name: `Video ${index + 1}`
      });
    });
    
    setProductMedia(media);
    setShowProductModal(true);
  };

  const confirmSaveProduct = () => {
    // Validate product ID
    if (editingProduct && (!editingProduct.id || typeof editingProduct.id !== 'string' || editingProduct.id === 'undefined')) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'מזהה המוצר לא תקין',
        type: 'error'
      });
      return;
    }

    if (!newProduct.name || !newProduct.description || !newProduct.price || newProduct.price <= 0) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות הנדרשים',
        type: 'error'
      });
      return;
    }

    if (!newProduct.category) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא בחר קטגוריה',
        type: 'error'
      });
      return;
    }

    if (!newProduct.subcategory) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא בחר תת-קטגוריה',
        type: 'error'
      });
      return;
    }

    if (!newProduct.pricingTier) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא בחר מדרג מחירים',
        type: 'error'
      });
      return;
    }

    if (productMedia.length === 0) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא העלה לפחות תמונת מוצר אחת',
        type: 'error'
      });
      return;
    }

    saveProduct();
  };

  const saveProduct = async () => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const productData = {
        ...newProduct,
        images: productMedia.filter(m => m.type === 'image').map(m => m.uri),
        videos: productMedia.filter(m => m.type === 'video').map(m => m.uri)
      };
      
      if (editingProduct) {
        // Update existing product
        await db.updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? {...p, ...productData} : p));
        
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'המוצר עודכן בהצלחה',
          type: 'success'
        });
      } else {
        // Add new product
        const productId = await db.addProduct(productData as Omit<Product, 'id'>);
        const addedProduct = {...productData, id: productId} as Product;
        setProducts(prev => [...prev, addedProduct]);
        
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'המוצר נוסף בהצלחה',
          type: 'success'
        });
      }
      
      setShowProductModal(false);
    } catch (error) {
      errorLog('Error saving product:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שמירת המוצר נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProduct = () => {
    if (!editingProduct) return;
    // Close the edit modal so the confirmation modal is visible on web
    setShowProductModal(false);
    // Wait for the modal to close before showing the confirmation dialog
    setTimeout(() => {
      setConfirmDeleteVisible(true);
    }, 300);
  };

  const deleteProduct = async (productId: string) => {
    // Validate product ID
    if (!productId || typeof productId !== 'string' || productId === 'undefined') {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'מזהה המוצר לא תקין',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      setShowProductModal(false);
      
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'המוצר נמחק בהצלחה',
        type: 'success'
      });
    } catch (error) {
      errorLog('Error deleting product:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'מחיקת המוצר נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (category: string) => {
    setNewProduct({...newProduct, category});
    setShowCategorySelector(false);
    
    // Reset subcategory when category changes
    setNewProduct(prev => ({...prev, subcategory: ''}));
  };

  const selectSubcategory = (subcategory: string) => {
    setNewProduct({...newProduct, subcategory});
    setShowSubcategorySelector(false);
  };

  const selectPricingTier = (tierId: string) => {
    setNewProduct({...newProduct, pricingTier: tierId});
    setShowPricingTierSelector(false);
  };

  const renderProduct = (item: Product) => (
    <Card
      Component={TouchableOpacity}
      key={item.id}
      style={[styles.productCard, {
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary,
      }]}
      onPress={() => push(`/product/${item.id}`)}
    >
      <View style={styles.productImageContainer}>
        {item.images && item.images.length > 0 ? (
          <SmartImage
            uri={item.images[0]}
            width={CARD_WIDTH}
            height={IMAGE_HEIGHT}
            contentFit="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>אין תמונה</Text>
          </View>
        )}
        
        {/* Favorite Button */}
        <TouchableOpacity style={styles.favoriteButton}>
          <Heart size={16} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Admin Actions */}
        {isStoreOwner && (
          <View style={styles.adminActions}>
            <TouchableOpacity 
              style={styles.adminActionButton}
              onPress={(e) => {
                e.stopPropagation();
                editProduct(item);
              }}
            >
              <Pencil size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={2}>{item.name}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={[styles.currentPrice, { color: colors.gold }]}>{currencySymbol}{item.price.toFixed(2)}</Text>
          {item.originalPrice && (
            <Text style={[styles.originalPrice, { color: colors.text.tertiary }]}>{currencySymbol}{item.originalPrice.toFixed(2)}</Text>
          )}
        </View>

        {item.pricingTier && (
          <View style={styles.pricingTierContainer}>
            <Text style={[styles.pricingTierText, { color: colors.text.secondary }]}>
              {pricingTiers.find(tier => tier.id === item.pricingTier)?.name || item.pricingTier}
            </Text>
          </View>
        )}
        
        <View style={styles.stockContainer}>
          <View style={[
            styles.stockIndicator,
            { backgroundColor: item.stock > 0 ? colors.status.success : colors.status.error }
          ]} />
          <Text style={[styles.stockText, { color: colors.text.secondary }]}>
            {item.stock > 0 ? `במלאי (${item.stock})` : 'אזל מהמלאי'}
          </Text>
        </View>
      </View>
    </Card>
  );

  if (loading && !subcategory) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>טוען...</Text>
          <View style={commonStyles.spacer24} />
        </View>
        <Spinner label="Loading subcategory" />
      </SafeAreaView>
    );
  }

  if (!subcategory) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>לא נמצא</Text>
          <View style={commonStyles.spacer24} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>תת-קטגוריה לא נמצאה</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{subcategory.name}</Text>
        <View style={styles.headerActions}>
          {isStoreOwner && (
            <>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.gold }]}
                onPress={addProduct}
              >
                <Plus size={20} color={colors.text.inverse} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.interactive.secondary }]}
                onPress={openEditSubcategory}
              >
                <Pencil size={20} color={colors.text.inverse} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.productsContainer}
        showsVerticalScrollIndicator={false}
      >
        {products.length > 0 ? (
          <View style={styles.productsGrid}>
            {products.map(renderProduct)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{subcategory.icon}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>אין מוצרים עדיין</Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {isStoreOwner ? 'הוסף מוצרים כדי להתחיל' : 'אנחנו עובדים על הוספת מוצרים לקטגוריה זו'}
            </Text>
            {isStoreOwner && (
              <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.gold }]} onPress={addProduct}>
                <Plus size={20} color={colors.text.inverse} />
                <Text style={[styles.emptyButtonText, { color: colors.text.inverse }]}>הוסף מוצר</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Product Edit/Add Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProductModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { 
            borderBottomColor: colors.border.primary 
          }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingProduct ? 'עריכת מוצר' : 'הוספת מוצר חדש'}
            </Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <MediaUploader
              media={productMedia}
              onMediaChange={setProductMedia}
              maxFiles={6}
              allowVideos={true}
            />

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>שם המוצר *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({...newProduct, name: text})}
                placeholder="הכנס שם מוצר"
                textAlign="end"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מחיר *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newProduct.price?.toString()}
                onChangeText={(text) => setNewProduct({...newProduct, price: parseFloat(text) || 0})}
                placeholder="הכנס מחיר"
                keyboardType="numeric"
                textAlign="end"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מחיר מקורי (אופציונלי)</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newProduct.originalPrice?.toString() || ''}
                onChangeText={(text) => setNewProduct({...newProduct, originalPrice: parseFloat(text) || undefined})}
                placeholder="הכנס מחיר מקורי"
                keyboardType="numeric"
                textAlign="end"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מדרג מחירים *</Text>
              <TouchableOpacity 
                style={[styles.categorySelector, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary 
                }]}
                onPress={() => setShowPricingTierSelector(true)}
              >
                <Text style={[
                  styles.categorySelectorText,
                  { color: colors.text.primary },
                  !newProduct.pricingTier && { color: colors.text.tertiary }
                ]}>
                  {newProduct.pricingTier ? 
                    pricingTiers.find(t => t.id === newProduct.pricingTier)?.name || newProduct.pricingTier 
                    : "בחר מדרג מחירים"}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.helperText, { color: colors.text.tertiary }]}>
                מדרגי מחירים מאפשרים לך להגדיר מחירים שונים לפי כמות הפריטים שנרכשים
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תיאור *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({...newProduct, description: text})}
                placeholder="הכנס תיאור מוצר"
                multiline
                numberOfLines={4}
                textAlign="end"
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
                  { color: colors.text.primary },
                  !newProduct.category && { color: colors.text.tertiary }
                ]}>
                  {newProduct.category ? 
                    categories.find(c => c.id === newProduct.category)?.name || newProduct.category 
                    : "בחר קטגוריה"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תת-קטגוריה *</Text>
              <TouchableOpacity 
                style={[styles.categorySelector, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  opacity: newProduct.category ? 1 : 0.5
                }]}
                onPress={() => {
                  if (newProduct.category) {
                    setShowSubcategorySelector(true);
                  } else {
                    setInfoModal({
                      visible: true,
                      title: 'שגיאה',
                      message: 'אנא בחר קטגוריה תחילה',
                      type: 'error'
                    });
                  }
                }}
                disabled={!newProduct.category}
              >
                <Text style={[
                  styles.categorySelectorText,
                  { color: colors.text.primary },
                  !newProduct.subcategory && { color: colors.text.tertiary }
                ]}>
                  {newProduct.subcategory ? 
                    availableSubcategories.find(s => s.id === newProduct.subcategory)?.name || newProduct.subcategory 
                    : "בחר תת-קטגוריה"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מלאי *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newProduct.stock?.toString()}
                onChangeText={(text) => setNewProduct({...newProduct, stock: parseInt(text) || 0})}
                placeholder="הכנס כמות במלאי"
                keyboardType="numeric"
                textAlign="end"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תגיות (אופציונלי)</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newProduct.badges?.join(', ')}
                onChangeText={(text) => {
                  const badges = text.split(',').map(b => b.trim()).filter(b => b);
                  setNewProduct({...newProduct, badges});
                }}
                placeholder="הכנס תגיות מופרדות בפסיקים (למשל: חדש, מבצע, מומלץ)"
                textAlign="end"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={confirmSaveProduct}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור מוצר</Text>
                  </>
                )}
              </TouchableOpacity>

              {editingProduct && (
                <TouchableOpacity 
                  style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                  onPress={confirmDeleteProduct}
                  disabled={loading}
                >
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק מוצר</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Subcategory Edit Modal */}
      <Modal
        visible={showSubcategoryEditModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSubcategoryEditModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>עריכת תת-קטגוריה</Text>
            <TouchableOpacity onPress={() => setShowSubcategoryEditModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>שם תת-הקטגוריה *</Text>
              <TextInput
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editSubcategoryData.name}
                onChangeText={(text) => setEditSubcategoryData({ ...editSubcategoryData, name: text })}
                placeholder="הכנס שם תת-קטגוריה"
                textAlign="end"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>אייקון (אמוג'י) *</Text>
              <TextInput
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editSubcategoryData.icon}
                onChangeText={(text) => setEditSubcategoryData({ ...editSubcategoryData, icon: text })}
                placeholder="הכנס אמוג'י (למשל: 💻)"
                textAlign="center"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveSubcategoryChanges}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור תת-קטגוריה</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                onPress={deleteCurrentSubcategory}
                disabled={loading}
              >
                <Trash2 size={20} color={colors.text.inverse} />
                <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק תת-קטגוריה</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Selector Modal */}
      <Modal
        visible={showCategorySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategorySelector(false)}
      >
        <View style={styles.categorySelectorOverlay}>
          <View style={[styles.categorySelectorContent, { backgroundColor: colors.surface.elevated }]}>
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
                  push('/(tabs)/categories');
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

      {/* Subcategory Selector Modal */}
      <Modal
        visible={showSubcategorySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubcategorySelector(false)}
      >
        <View style={styles.categorySelectorOverlay}>
          <View style={[styles.categorySelectorContent, { backgroundColor: colors.surface.elevated }]}>
            <View style={styles.categorySelectorHeader}>
              <Text style={[styles.categorySelectorTitle, { color: colors.text.primary }]}>בחר תת-קטגוריה</Text>
              <TouchableOpacity onPress={() => setShowSubcategorySelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categorySelectorList}>
              {availableSubcategories.length > 0 ? (
                availableSubcategories.map((subcategory) => (
                  <TouchableOpacity
                    key={subcategory.id}
                    style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary }]}
                    onPress={() => selectSubcategory(subcategory.id)}
                  >
                    <View style={styles.categorySelectorItemContent}>
                      <Text style={styles.categorySelectorItemIcon}>{subcategory.icon}</Text>
                      <Text style={[styles.categorySelectorItemText, { color: colors.text.primary }]}>{subcategory.name}</Text>
                    </View>
                    <Text style={[styles.categorySelectorItemId, { color: colors.text.tertiary }]}>{subcategory.id}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptySubcategories}>
                  <Text style={[styles.emptySubcategoriesText, { color: colors.text.secondary }]}>
                    אין תת-קטגוריות זמינות לקטגוריה זו
                  </Text>
                </View>
              )}
              
              {/* Add new subcategory option */}
              <TouchableOpacity
                style={[styles.categorySelectorItem, { 
                  borderBottomColor: colors.border.secondary,
                  backgroundColor: colors.interactive.secondary
                }]}
                onPress={() => {
                  setShowSubcategorySelector(false);
                  push(`/category/${newProduct.category}`);
                }}
              >
                <View style={styles.categorySelectorItemContent}>
                  <Plus size={20} color={colors.gold} />
                  <Text style={[styles.categorySelectorItemText, { color: colors.gold }]}>הוסף תת-קטגוריה חדשה</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pricing Tier Selector Modal */}
      <Modal
        visible={showPricingTierSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPricingTierSelector(false)}
      >
        <View style={styles.categorySelectorOverlay}>
          <View style={[styles.categorySelectorContent, { backgroundColor: colors.surface.elevated }]}>
            <View style={styles.categorySelectorHeader}>
              <Text style={[styles.categorySelectorTitle, { color: colors.text.primary }]}>בחר מדרג מחירים</Text>
              <TouchableOpacity onPress={() => setShowPricingTierSelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categorySelectorList}>
              {(pricingTiers || []).map((tier) => (
                <TouchableOpacity
                  key={tier.id}
                  style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary }]}
                  onPress={() => selectPricingTier(tier.id)}
                >
                  <View style={styles.categorySelectorItemContent}>
                    <Text style={[styles.pricingTierDiscount, { color: colors.gold }]}>
                      {typeof tier.pricePerUnit === 'number' ? 
                        `מחיר ליחידה: ${currencySymbol}${tier.pricePerUnit.toFixed(2)}` : 
                        'מחיר רגיל'}
                    </Text>
                    <View style={styles.pricingTierInfo}>
                      <Text style={[styles.categorySelectorItemText, { color: colors.text.primary }]}>{tier.name}</Text>
                      <Text style={[styles.pricingTierDescription, { color: colors.text.secondary }]}>
                        {tier.description} (מינימום {tier.minQuantity} יחידות)
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Add new pricing tier option */}
              <TouchableOpacity
                style={[styles.categorySelectorItem, { 
                  borderBottomColor: colors.border.secondary,
                  backgroundColor: colors.interactive.secondary
                }]}
                onPress={() => {
                  setShowPricingTierSelector(false);
                  if (storeId) {
                    push(`/store/${storeId}/admin/pricing-tiers`);
                  }
                }}
              >
                <View style={styles.categorySelectorItemContent}>
                  <Plus size={20} color={colors.gold} />
                  <Text style={[styles.categorySelectorItemText, { color: colors.gold }]}>הוסף מדרג מחירים חדש</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={confirmDeleteVisible}
        title="אישור מחיקה"
        message="האם אתה בטוח שברצונך למחוק את המוצר?"
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={() => {
          setConfirmDeleteVisible(false);
          if (editingProduct) {
            deleteProduct(editingProduct.id);
          }
        }}
        onCancel={() => {
          setConfirmDeleteVisible(false);
          // Reopen the edit modal if the user cancels deletion
          setShowProductModal(true);
        }}
        destructive={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  productsContainer: {
    padding: 16,
    minHeight: '100%',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  productImageContainer: {
    position: 'relative',
    height: IMAGE_HEIGHT,
    width: CARD_WIDTH,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: 14,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    start: 8,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    position: 'absolute',
    top: 8,
    end: 8,
    flexDirection: 'row',
  },
  adminActionButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18,
    textAlign: 'end',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  pricingTierContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  pricingTierText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stockIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    textAlign: 'end',
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
  helperText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'end',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  pricingTierInfo: {
    marginLeft: 12,
    flex: 1,
    alignItems: 'flex-end',
  },
  pricingTierDiscount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pricingTierDescription: {
    fontSize: 12,
    textAlign: 'end',
  },
});
