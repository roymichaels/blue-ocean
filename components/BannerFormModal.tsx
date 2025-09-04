import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X, Save, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { HeroBanner, Category } from '../types';
import DatabaseService from '@/services/database';
import { Spinner } from '@/ui/primitives';
import InfoModal from './InfoModal';
import ConfirmationModal from './ConfirmationModal';

interface BannerFormModalProps {
  visible: boolean;
  onClose: () => void;
  banner?: HeroBanner | null;
  categories: Category[];
  onSaved?: (banner: HeroBanner, isNew: boolean) => void;
  onDeleted?: (id: string) => void;
}

export default function BannerFormModal({
  visible,
  onClose,
  banner,
  categories,
  onSaved,
  onDeleted,
}: BannerFormModalProps) {
  const { colors } = useTheme();
  const [editingBanner, setEditingBanner] = useState<Partial<HeroBanner>>({});
  const [imageUrl, setImageUrl] = useState('');
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      initForm();
    }
    // The exhaustive-deps rule is not enabled in this project
    // so the following dependency array is intentional.
  }, [visible, banner]);

  const initForm = () => {
    if (banner) {
      setEditingBanner({ ...banner });
      setImageUrl(banner.image || '');
    } else {
      setEditingBanner({
        title: '',
        subtitle: '',
        category: '',
        isActive: true,
        order: 1,
      });
      setImageUrl('');
    }
  };

  const selectCategory = (id: string) => {
    setEditingBanner({ ...editingBanner, category: id });
    setShowCategorySelector(false);
  };

  const saveBanner = async () => {
    if (!editingBanner.category) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות',
        type: 'error',
      });
      return;
    }

    if (!imageUrl) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'Please provide a banner image CID or URL',
        type: 'error',
      });
      return;
    }

    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const bannerData = {
        ...editingBanner,
        image: imageUrl,
      } as Partial<HeroBanner>;

      if (banner) {
        await db.updateHeroBanner(banner.id, bannerData);
        onSaved?.(
          { ...(banner as HeroBanner), ...bannerData } as HeroBanner,
          false,
        );
      } else {
        const newId = await db.addHeroBanner(
          bannerData as Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>,
        );
        const added = {
          ...(bannerData as HeroBanner),
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as HeroBanner;
        onSaved?.(added, true);
      }

      onClose();
    } catch (error) {
      errorLog('Error saving banner:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שמירת הבאנר נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async () => {
    if (!banner) return;
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      await db.deleteHeroBanner(banner.id);
      onDeleted?.(banner.id);
      onClose();
    } catch (error) {
      errorLog('Error deleting banner:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'מחיקת הבאנר נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              \{banner ? 'עריכת באנר' : 'הוספת באנר חדש'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תמונת באנר (CID או URL)</Text>
              <TextInput
                multiline
                style={[
                  styles.formInput,
                  {
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                    height: 80,
                    textAlignVertical: 'top'
                  },
                ]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="ipfs://..."
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>
                כותרת *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                  },
                ]}
                value={editingBanner.title}
                onChangeText={(text) =>
                  setEditingBanner({ ...editingBanner, title: text })
                }
                placeholder="הכנס כותרת באנר"
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>
                כותרת משנה *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                  },
                ]}
                value={editingBanner.subtitle}
                onChangeText={(text) =>
                  setEditingBanner({ ...editingBanner, subtitle: text })
                }
                placeholder="הכנס כותרת משנה"
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>


            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>
                קטגוריה *
              </Text>
              <TouchableOpacity
                style={[
                  styles.categorySelector,
                  {
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                  },
                ]}
                onPress={() => setShowCategorySelector(true)}
              >
                <Text
                  style={[
                    styles.categorySelectorText,
                    {
                      color: editingBanner.category
                        ? colors.text.primary
                        : colors.text.tertiary,
                    },
                  ]}
                >
                  {editingBanner.category || 'בחר קטגוריה'}
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
                  <Spinner
                    size="small"
                    color={colors.text.inverse}
                    style={styles.buttonSpinner}
                  />
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: colors.text.inverse },
                      ]}
                    >
                      שמור באנר
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {banner && (
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    { backgroundColor: colors.status.error },
                  ]}
                  onPress={() => setConfirmDelete(true)}
                  disabled={loading}
                >
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text
                    style={[
                      styles.deleteButtonText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    מחק באנר
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showCategorySelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategorySelector(false)}
      >
        <View
          style={[
            styles.categorySelectorOverlay,
            { backgroundColor: 'rgba(0,0,0,0.5)' },
          ]}
        >
          <View
            style={[
              styles.categorySelectorContent,
              {
                backgroundColor: colors.surface.elevated,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <View style={styles.categorySelectorHeader}>
              <Text
                style={[
                  styles.categorySelectorTitle,
                  { color: colors.text.primary },
                ]}
              >
                בחר קטגוריה
              </Text>
              <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categorySelectorList}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.categorySelectorItem,
                    { borderBottomColor: colors.border.secondary },
                  ]}
                  onPress={() => selectCategory(c.id)}
                >
                  <View style={styles.categorySelectorItemContent}>
                    <Text style={styles.categorySelectorItemIcon}>
                      {c.icon}
                    </Text>
                    <Text
                      style={[
                        styles.categorySelectorItemText,
                        { color: colors.text.primary },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.categorySelectorItemId,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    {c.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />

      <ConfirmationModal
        visible={confirmDelete}
        title="אישור מחיקה"
        message="האם אתה בטוח שברצונך למחוק את הבאנר?"
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={() => {
          setConfirmDelete(false);
          deleteBanner();
        }}
        onCancel={() => setConfirmDelete(false)}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 16 },
  formGroup: { marginBottom: 20 },
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
  modalActions: { gap: 16, marginTop: 20, marginBottom: 40 },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  buttonSpinner: { marginRight: 8 },
  categorySelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categorySelectorText: { fontSize: 16, textAlign: 'right' },
  categorySelectorOverlay: { flex: 1, justifyContent: 'flex-end' },
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
  categorySelectorTitle: { fontSize: 18, fontWeight: 'bold' },
  categorySelectorList: { maxHeight: 400 },
  categorySelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  categorySelectorItemContent: { flexDirection: 'row', alignItems: 'center' },
  categorySelectorItemIcon: { fontSize: 24, marginRight: 12 },
  categorySelectorItemText: { fontSize: 16, fontWeight: '500' },
  categorySelectorItemId: { fontSize: 12 },
});
