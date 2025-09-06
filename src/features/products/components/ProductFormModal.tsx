import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { X, Save, Trash2, Plus } from 'lucide-react-native';
import { Product, Subcategory, PricingTier, ProductIndexItem } from '@/types';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import DatabaseService from '@/services/database';
import PinataService from '@/services/pinata';
import ipfsService from '@/services/ipfsService';
import chain, { chainAdapter } from '@/services/chain';

let setProductBatch:
  | ((items: ProductIndexItem[]) => Promise<void>)
  | undefined;
if (chain === 'near') {
  ({ setProductBatch } = require('../services/nearProductIndex'));
}
// Note: Avoid importing expo-video on web — it can break bundling if APIs differ.
// We'll lazily require react-native-video on native platforms for preview.
import InfoModal from '@/components/InfoModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import PricingTierFormModal from "./PricingTierFormModal";
import SubcategoryPicker from './SubcategoryPicker';
import { useCategories } from '@/services';
import { useAppRouter } from '@/services';
import { routes } from '@/utils/routes';
import { Spinner } from '@/ui/primitives';

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved?: (product: Product, isNew: boolean) => void;
  onDeleted?: (id: string) => void;
}

export default function ProductFormModal({
  visible,
  onClose,
  product,
  onSaved,
  onDeleted,
}: ProductFormModalProps) {
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const address = chainAdapter.useAccountId();
  const { push } = useAppRouter();
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [imageUrls, setImageUrls] = useState('');
  const [videoUrls, setVideoUrls] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const { data: categories = [] } = useCategories();
  const pinata = PinataService.getInstance();

  const toHttpUrl = (uri: string) =>
    uri.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}` : uri;
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [variants, setVariants] = useState<{ color: string; stock: number }[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showSubcategorySelector, setShowSubcategorySelector] = useState(false);
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);
  const [showPricingTierSelector, setShowPricingTierSelector] = useState(false);
  const [showPricingTierForm, setShowPricingTierForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  useEffect(() => {
    if (visible) {
      initForm();
      loadPricingTiers();
    }
  }, [visible, product, address]);

  useEffect(() => {
    const category = categories.find(c => c.id === editingProduct.category);
    setAvailableSubcategories(category?.subcategories || []);
  }, [editingProduct.category, categories]);

  const initForm = () => {
    setEditingProduct(
      product
        ? { ...product }
        : {
            name: '',
            price: 0,
            description: '',
            category: '',
            stock: 0,
            storeId: address || '',
          }
    );

    setImageUrls((product?.images || []).join('\n'));
    setVideoUrls((product?.videos || []).join('\n'));
    setVariants(product?.variants || []);
  };

  const loadPricingTiers = async () => {
    try {
      const db = DatabaseService.getInstance();
      const data = await db.getPricingTiers();
      setPricingTiers(data);
    } catch (error) {
      errorLog('Error loading pricing tiers:', error);
    }
  };

  const selectCategory = (id: string) => {
    setEditingProduct({ ...editingProduct, category: id, subcategory: '' });
    const category = categories.find(c => c.id === id);
    setAvailableSubcategories(category?.subcategories || []);
    setShowCategorySelector(false);
  };

  const selectSubcategory = (id: string) => {
    setEditingProduct({ ...editingProduct, subcategory: id });
    setShowSubcategorySelector(false);
  };

  const selectPricingTier = (id: string) => {
    setEditingProduct({ ...editingProduct, pricingTier: id });
    setShowPricingTierSelector(false);
  };

  const addVariant = () => {
    setVariants([...variants, { color: '', stock: 0 }]);
  };

  const updateVariant = (index: number, field: 'color' | 'stock', value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const saveProduct = async () => {
    if (!editingProduct.name || !editingProduct.description || !editingProduct.price || editingProduct.price <= 0) {
      setInfoModal({ visible: true, title: 'שגיאה', message: 'אנא מלא את כל השדות הנדרשים', type: 'error' });
      return;
    }
    setImageError(null);
    setVideoError(null);
    const images = imageUrls
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const videos = videoUrls
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (images.length === 0 && videos.length === 0) {
      setInfoModal({ visible: true, title: 'שגיאה', message: 'אנא ספק לפחות מדיה אחת', type: 'error' });
      return;
    }

    let hasError = false;
    images.forEach((uri, index) => {
      if (!pinata.isCidOrUrl(uri)) {
        setImageError(`שורה ${index + 1} אינה CID או קישור תקין`);
        hasError = true;
      }
    });
    videos.forEach((uri, index) => {
      if (!pinata.isCidOrUrl(uri)) {
        setVideoError(`שורה ${index + 1} אינה CID או קישור תקין`);
        hasError = true;
      }
    });
    if (hasError) return;

    const allMedia = [...images, ...videos];
    const first = allMedia[0];
    if (first) {
      try {
        const res = await fetch(toHttpUrl(first), { method: 'HEAD' });
        if (!res.ok) {
          setInfoModal({ visible: true, title: 'שגיאה', message: 'המדיה הראשונה אינה נגישה', type: 'error' });
          return;
        }
      } catch {
        setInfoModal({ visible: true, title: 'שגיאה', message: 'המדיה הראשונה אינה נגישה', type: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      const pinnedImages = await Promise.all(
        images.map((uri, idx) => ipfsService.pinFile(uri, `image-${idx}`)),
      );
      const metadataCid = await ipfsService.pinJson({
        ...editingProduct,
        images: pinnedImages,
        videos,
      });

      const db = DatabaseService.getInstance();
      const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const data = {
        ...editingProduct,
        storeId: editingProduct.storeId || address || '',
        images: pinnedImages,
        videos,
        colors: variants.map((v) => v.color),
        variants,
        stock: variants.length > 0 ? totalVariantStock : editingProduct.stock,
      };

      let saved: Product;
      let isNew = false;
      if (product && product.id) {
        await db.updateProduct(product.id, data);
        saved = { ...(product as Product), ...(data as Partial<Product>) } as Product;
      } else {
        const id = await db.addProduct(data as Omit<Product, 'id'>);
        saved = { ...(data as Omit<Product, 'id'>), id } as Product;
        isNew = true;
      }

      const indexItem: ProductIndexItem = {
        id: saved.id,
        storeId: saved.storeId,
        price: saved.price,
        metadataUri: metadataCid,
        image: pinnedImages[0] || '',
      };
      if (setProductBatch) {
        await setProductBatch([indexItem]);
      }

      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'המוצר נשמר בהצלחה',
        type: 'success',
      });
      onSaved?.(saved, isNew);
      setTimeout(onClose, 500);
    } catch (error) {
      errorLog('Error saving product:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שמירת המוצר נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    setConfirmDeleteModal(true);
  };

  const deleteProduct = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deleteProduct(product.id);
      setInfoModal({ visible: true, title: 'הצלחה', message: 'המוצר נמחק בהצלחה', type: 'success' });
      onDeleted?.(product.id);
      setTimeout(onClose, 500);
    } catch (error) {
      errorLog('Error deleting product:', error);
      setInfoModal({ visible: true, title: 'שגיאה', message: 'מחיקת המוצר נכשלה', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {product ? 'עריכת מוצר' : 'הוספת מוצר חדש'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תמונות (CID או URL, שורה לכל פריט)</Text>
              <TextInput
                multiline
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                  height: 80,
                  textAlignVertical: 'top'
                }]}
                value={imageUrls}
                onChangeText={(text) => {
                  setImageUrls(text);
                  const first = text.split('\n').map(s => s.trim()).find(Boolean) || null;
                  if (first && pinata.isCidOrUrl(first)) {
                    setImagePreview(first);
                  } else {
                    setImagePreview(null);
                  }
                  setImageError(null);
                }}
                placeholder="ipfs://..."
                textAlign="right"
              />
              {imagePreview ? (
                <Image source={{ uri: toHttpUrl(imagePreview) }} style={styles.mediaPreview} />
              ) : (
                <View style={[styles.mediaPreview, { backgroundColor: colors.surface.secondary }]} />
              )}
              {imageError && (
                <Text style={[styles.errorText, { color: colors.status.error }]}>{imageError}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>סרטונים (CID או URL, שורה לכל פריט)</Text>
              <TextInput
                multiline
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                  height: 80,
                  textAlignVertical: 'top'
                }]}
                value={videoUrls}
                onChangeText={(text) => {
                  setVideoUrls(text);
                  const first = text.split('\n').map(s => s.trim()).find(Boolean) || null;
                  if (first && pinata.isCidOrUrl(first)) {
                    setVideoPreview(first);
                  } else {
                    setVideoPreview(null);
                  }
                  setVideoError(null);
                }}
                placeholder="ipfs://..."
                textAlign="right"
              />
              {videoPreview ? (
                Platform.OS === 'web' ? (
                  <View
                    style={[
                      styles.mediaPreview,
                      {
                        backgroundColor: colors.surface.secondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Text style={{ color: colors.text.tertiary }}>
                      Video preview not supported on web
                    </Text>
                  </View>
                ) : (
                  (() => {
                    try {
                      const RNVideo = require('react-native-video').default;
                      return (
                        <RNVideo
                          source={{ uri: toHttpUrl(videoPreview) }}
                          style={styles.mediaPreview}
                          controls
                          repeat
                          muted
                          resizeMode="contain"
                        />
                      );
                    } catch (e) {
                      return (
                        <View style={[styles.mediaPreview, { backgroundColor: colors.surface.secondary }]} />
                      );
                    }
                  })()
                )
              ) : (
                <View style={[styles.mediaPreview, { backgroundColor: colors.surface.secondary }]} />
              )}
              {videoError && (
                <Text style={[styles.errorText, { color: colors.status.error }]}>{videoError}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>שם המוצר *</Text>
              <TextInput
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editingProduct.name}
                onChangeText={text => setEditingProduct({ ...editingProduct, name: text })}
                placeholder="הכנס שם מוצר"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מחיר *</Text>
              <TextInput
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editingProduct.price?.toString()}
                onChangeText={text => setEditingProduct({ ...editingProduct, price: parseFloat(text) || 0 })}
                placeholder="הכנס מחיר"
                keyboardType="numeric"
                textAlign="right"
              />
            </View>


            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מדרג מחירים *</Text>
              <TouchableOpacity
                style={[styles.categorySelector, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                }]}
                onPress={() => setShowPricingTierSelector(true)}
              >
                <Text style={[styles.categorySelectorText, { color: colors.text.primary }, !editingProduct.pricingTier && { color: colors.text.tertiary }]}>
                  {editingProduct.pricingTier
                    ? pricingTiers.find(t => t.id === editingProduct.pricingTier)?.name || editingProduct.pricingTier
                    : 'בחר מדרג מחירים'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.helperText, { color: colors.text.tertiary }]}>מדרגי מחירים מאפשרים לך להגדיר מחירים שונים לפי כמות הפריטים שנרכשים</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תיאור *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editingProduct.description}
                onChangeText={text => setEditingProduct({ ...editingProduct, description: text })}
                placeholder="הכנס תיאור מוצר"
                multiline
                numberOfLines={4}
                textAlign="right"
              />
            </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.primary }]}>קטגוריה *</Text>
                <TouchableOpacity
                  style={[styles.categorySelector, {
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                  }]}
                  onPress={() => setShowCategorySelector(true)}
                >
                  <Text style={[styles.categorySelectorText, { color: colors.text.primary }, !editingProduct.category && { color: colors.text.tertiary }]}>
                    {editingProduct.category
                      ? categories.find(c => c.id === editingProduct.category)?.name || editingProduct.category
                      : 'בחר קטגוריה'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.primary }]}>תת-קטגוריה</Text>
                <TouchableOpacity
                  style={[styles.categorySelector, {
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                    opacity: editingProduct.category ? 1 : 0.5,
                  }]}
                  onPress={() => {
                    if (editingProduct.category) {
                      setShowSubcategorySelector(true);
                    } else {
                      setInfoModal({ visible: true, title: 'שגיאה', message: 'אנא בחר קטגוריה תחילה', type: 'error' });
                    }
                  }}
                  disabled={!editingProduct.category}
                >
                  <Text style={[styles.categorySelectorText, { color: colors.text.primary }, !editingProduct.subcategory && { color: colors.text.tertiary }]}>
                    {editingProduct.subcategory
                      ? availableSubcategories.find(s => s.id === editingProduct.subcategory)?.name || editingProduct.subcategory
                      : 'בחר תת-קטגוריה'}
                  </Text>
                </TouchableOpacity>
              </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>וריאציות צבע</Text>
              {variants.map((variant, index) => (
                <View key={index} style={styles.variantRow}>
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: variant.color || 'transparent', borderColor: colors.border.primary },
                    ]}
                  />
                  <TextInput
                    style={[
                      styles.variantColorInput,
                      {
                        borderColor: colors.border.primary,
                        backgroundColor: colors.surface.primary,
                        color: colors.text.primary,
                      },
                    ]}
                    value={variant.color}
                    onChangeText={(text) => updateVariant(index, 'color', text)}
                    placeholder="צבע"
                    textAlign="right"
                  />
                  <TextInput
                    style={[
                      styles.variantStockInput,
                      {
                        borderColor: colors.border.primary,
                        backgroundColor: colors.surface.primary,
                        color: colors.text.primary,
                      },
                    ]}
                    value={variant.stock?.toString()}
                    onChangeText={(text) => updateVariant(index, 'stock', parseInt(text) || 0)}
                    placeholder="מלאי"
                    keyboardType="numeric"
                    textAlign="right"
                  />
                  <TouchableOpacity onPress={() => removeVariant(index)} style={styles.removeVariantButton}>
                    <Trash2 size={20} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addVariantButton, { borderColor: colors.border.primary, backgroundColor: colors.interactive.secondary }]}
                onPress={addVariant}
              >
                <Plus size={20} color={colors.gold} />
                <Text style={[styles.addVariantText, { color: colors.gold }]}>הוסף וריאציה</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מלאי *</Text>
              <TextInput
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editingProduct.stock?.toString()}
                onChangeText={text => setEditingProduct({ ...editingProduct, stock: parseInt(text) || 0 })}
                placeholder="הכנס כמות במלאי"
                keyboardType="numeric"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תגיות (אופציונלי)</Text>
              <TextInput
                style={[styles.formInput, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary,
                }]}
                value={editingProduct.badges?.join(', ')}
                onChangeText={text => {
                  const badges = text.split(',').map(b => b.trim()).filter(b => b);
                  setEditingProduct({ ...editingProduct, badges });
                }}
                placeholder="הכנס תגיות מופרדות בפסיקים (למשל: חדש, מבצע, מומלץ)"
                textAlign="right"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveProduct}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      size="small"
                      color={colors.text.inverse}
                      style={styles.buttonSpinner}
                    />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>מפרסם...</Text>
                  </>
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור שינויים</Text>
                  </>
                )}
              </TouchableOpacity>

              {product && (
                <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.status.error }]} onPress={confirmDelete} disabled={loading}>
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק מוצר</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <SubcategoryPicker
        visible={showSubcategorySelector}
        subcategories={availableSubcategories}
        onSelect={selectSubcategory}
        onClose={() => setShowSubcategorySelector(false)}
        onAdd={() => {
          setShowSubcategorySelector(false);
            if (editingProduct.category) {
              push(routes.category(editingProduct.category));
            }
        }}
      />

      <Modal visible={showCategorySelector} animationType="slide" transparent onRequestClose={() => setShowCategorySelector(false)}>
        <View style={styles.categorySelectorOverlay}>
          <View style={[styles.categorySelectorContent, { backgroundColor: colors.surface.elevated }]}>
            <View style={styles.categorySelectorHeader}>
              <Text style={[styles.categorySelectorTitle, { color: colors.text.primary }]}>בחר קטגוריה</Text>
              <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categorySelectorList}>
              {categories.map(category => (
                <TouchableOpacity key={category.id} style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary }]} onPress={() => selectCategory(category.id)}>
                  <View style={styles.categorySelectorItemContent}>
                    <Text style={styles.categorySelectorItemIcon}>{category.icon}</Text>
                    <Text style={[styles.categorySelectorItemText, { color: colors.text.primary }]}>{category.name}</Text>
                  </View>
                  <Text style={[styles.categorySelectorItemId, { color: colors.text.tertiary }]}>{category.id}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary, backgroundColor: colors.interactive.secondary }]}
                onPress={() => {
                  setShowCategorySelector(false);
                  push('/categories');
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

      <Modal visible={showPricingTierSelector} animationType="slide" transparent onRequestClose={() => setShowPricingTierSelector(false)}>
        <View style={styles.categorySelectorOverlay}>
          <View style={[styles.categorySelectorContent, { backgroundColor: colors.surface.elevated }]}>
            <View style={styles.categorySelectorHeader}>
              <Text style={[styles.categorySelectorTitle, { color: colors.text.primary }]}>בחר מדרג מחירים</Text>
              <TouchableOpacity onPress={() => setShowPricingTierSelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categorySelectorList}>
              {(pricingTiers || []).map(tier => (
                <TouchableOpacity key={tier.id} style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary }]} onPress={() => selectPricingTier(tier.id)}>
                  <View style={styles.categorySelectorItemContent}>
                    <Text style={[styles.pricingTierDiscount, { color: colors.gold }]}>
                      {typeof tier.pricePerUnit === 'number' ? `מחיר ליחידה: ${currencySymbol}${tier.pricePerUnit.toFixed(2)}` : 'מחיר רגיל'}
                    </Text>
                    <View style={styles.pricingTierInfo}>
                      <Text style={[styles.categorySelectorItemText, { color: colors.text.primary }]}>{tier.name}</Text>
                      <Text style={[styles.pricingTierDescription, { color: colors.text.secondary }]}> {tier.description} (מינימום {tier.minQuantity} יחידות)</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.categorySelectorItem, { borderBottomColor: colors.border.secondary, backgroundColor: colors.interactive.secondary }]}
                onPress={() => {
                  setShowPricingTierSelector(false);
                  setShowPricingTierForm(true);
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

      <PricingTierFormModal
        visible={showPricingTierForm}
        onClose={() => setShowPricingTierForm(false)}
        onSaved={(tier) => {
          setShowPricingTierForm(false);
          loadPricingTiers();
        }}
      />

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />

      <ConfirmationModal
        visible={confirmDeleteModal}
        title="אישור מחיקה"
        message="האם אתה בטוח שברצונך למחוק את המוצר?"
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={() => {
          setConfirmDeleteModal(false);
          deleteProduct();
        }}
        onCancel={() => setConfirmDeleteModal(false)}
        destructive
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 16 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'right' },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { gap: 16, marginTop: 20, marginBottom: 40 },
  saveButton: { borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  buttonSpinner: { marginRight: 8 },
  deleteButton: { borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  helperText: { fontSize: 12, marginTop: 4, textAlign: 'right' },
  categorySelector: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  categorySelectorText: { fontSize: 16, textAlign: 'right' },
  categorySelectorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  categorySelectorContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  categorySelectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  categorySelectorTitle: { fontSize: 18, fontWeight: 'bold' },
  categorySelectorList: { maxHeight: 400 },
  categorySelectorItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  categorySelectorItemContent: { flexDirection: 'row', alignItems: 'center' },
  categorySelectorItemIcon: { fontSize: 24, marginRight: 12 },
  categorySelectorItemText: { fontSize: 16, fontWeight: '500' },
  categorySelectorItemId: { fontSize: 12 },
  pricingTierInfo: { marginLeft: 12, flex: 1, alignItems: 'flex-end' },
  pricingTierDiscount: { fontSize: 14, fontWeight: 'bold' },
  pricingTierDescription: { fontSize: 12, textAlign: 'right' },
  variantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  colorPreview: { width: 24, height: 24, borderRadius: 12, marginRight: 8, borderWidth: 1 },
  variantColorInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  variantStockInput: { width: 80, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginLeft: 8 },
  removeVariantButton: { marginLeft: 8 },
  addVariantButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  addVariantText: { fontSize: 16, fontWeight: '500', marginLeft: 8 },
  mediaPreview: { width: '100%', height: 120, marginTop: 8, borderRadius: 8 },
  errorText: { fontSize: 14, marginTop: 4, textAlign: 'right' },
});
