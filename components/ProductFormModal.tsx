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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { X, Save, Trash2, Plus } from 'lucide-react-native';
import { Product, Category, Subcategory, PricingTier } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import DatabaseService from '../services/database';
import MediaUploader from './MediaUploader';
import InfoModal from './InfoModal';
import ConfirmationModal from './ConfirmationModal';
import PricingTierFormModal from "./PricingTierFormModal";
import SubcategoryPicker from './SubcategoryPicker';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
}

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
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [productMedia, setProductMedia] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
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
      loadCategories();
      loadPricingTiers();
    }
  }, [visible, product]);

  useEffect(() => {
    const category = categories.find(c => c.id === editingProduct.category);
    setAvailableSubcategories(category?.subcategories || []);
  }, [editingProduct.category, categories]);

  const initForm = () => {
    setEditingProduct(
      product
        ? { ...product }
        : { name: '', price: 0, description: '', category: '', stock: 0 }
    );

    const media: MediaItem[] = [];
    product?.images?.forEach((uri, index) => {
      media.push({ id: `image_${index}`, uri, type: 'image', name: `Image ${index + 1}` });
    });
    product?.videos?.forEach((uri, index) => {
      media.push({ id: `video_${index}`, uri, type: 'video', name: `Video ${index + 1}` });
    });
    setProductMedia(media);
  };

  const loadCategories = async () => {
    try {
      const db = DatabaseService.getInstance();
      const data = await db.getCategories();
      setCategories(data);
      if (editingProduct.category) {
        const category = data.find(c => c.id === editingProduct.category);
        setAvailableSubcategories(category?.subcategories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPricingTiers = async () => {
    try {
      const db = DatabaseService.getInstance();
      const data = await db.getPricingTiers();
      setPricingTiers(data);
    } catch (error) {
      console.error('Error loading pricing tiers:', error);
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

  const saveProduct = async () => {
    if (!editingProduct.name || !editingProduct.description || !editingProduct.price || editingProduct.price <= 0) {
      setInfoModal({ visible: true, title: 'שגיאה', message: 'אנא מלא את כל השדות הנדרשים', type: 'error' });
      return;
    }
    if (productMedia.length === 0) {
      setInfoModal({ visible: true, title: 'שגיאה', message: 'אנא העלה לפחות קובץ מדיה אחד', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const data = {
        ...editingProduct,
        images: productMedia.filter(m => m.type === 'image').map(m => m.uri),
        videos: productMedia.filter(m => m.type === 'video').map(m => m.uri),
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

      setInfoModal({ visible: true, title: 'הצלחה', message: 'המוצר נשמר בהצלחה', type: 'success' });
      onSaved?.(saved, isNew);
      setTimeout(onClose, 500);
    } catch (error) {
      console.error('Error saving product:', error);
      setInfoModal({ visible: true, title: 'שגיאה', message: 'שמירת המוצר נכשלה', type: 'error' });
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
      console.error('Error deleting product:', error);
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
            <MediaUploader media={productMedia} onMediaChange={setProductMedia} maxFiles={6} allowVideos={true} />

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
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.gold }]} onPress={saveProduct} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
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
            router.push(`/category/${editingProduct.category}`);
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
              {pricingTiers.map(tier => (
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
});
