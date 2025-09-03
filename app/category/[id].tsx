import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import { ArrowLeft, Plus, Pencil, X, Save, Trash2 } from 'lucide-react-native';
import DatabaseService from '../../services/database';
import { Category, Subcategory } from '../../types';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import InfoModal from '../../components/InfoModal';
import Spinner from '@shared/ui/Spinner';
import commonStyles from '@/constants/styles';

const validateParams = createValidateParams(z.object({ id: z.string() }));



export default function CategoryScreen() {
  const { push, back } = useAppRouter();
  const params = validateParams(useLocalSearchParams());
  const id = params.success ? params.data.id : undefined;
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [newSubcategory, setNewSubcategory] = useState<Partial<Subcategory>>({
    id: '',
    name: '',
    icon: '',
    categoryId: id || ''
  });
  const [loading, setLoading] = useState(true);
  const { isStoreOwner } = useAuth();
  const { colors } = useTheme();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (!id) return;
    loadCategory();
  }, [id]);

  const loadCategory = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const categories = await db.getCategories();
      const foundCategory = categories.find(cat => cat.id === id);
      
      if (foundCategory) {
        setCategory(foundCategory);
        setSubcategories(foundCategory.subcategories || []);
      }
    } catch (error) {
      errorLog('Error loading category:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת הקטגוריה נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!params.success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.primary }}>Invalid category</Text>
      </SafeAreaView>
    );
  }

  const addSubcategory = () => {
    setEditingSubcategory(null);
    setNewSubcategory({
      id: '',
      name: '',
      icon: '',
      categoryId: id || ''
    });
    setShowSubcategoryModal(true);
  };

  const editSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setNewSubcategory({...subcategory});
    setShowSubcategoryModal(true);
  };

  const saveSubcategory = async () => {
    if (!newSubcategory.name || !newSubcategory.icon || !newSubcategory.id) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      
      if (editingSubcategory) {
        // Update existing subcategory
        await db.updateSubcategory(editingSubcategory.id, newSubcategory);
        
        // Refresh category data
        await loadCategory();
        
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'תת-הקטגוריה עודכנה בהצלחה',
          type: 'success'
        });
      } else {
        // Add new subcategory
        await db.addSubcategory(newSubcategory as Subcategory);
        
        // Refresh category data
        await loadCategory();
        
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'תת-הקטגוריה נוספה בהצלחה',
          type: 'success'
        });
      }
      
      setShowSubcategoryModal(false);
    } catch (error) {
      errorLog('Error saving subcategory:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'שמירת תת-הקטגוריה נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSubcategory = async (subcategoryId: string) => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deleteSubcategory(subcategoryId);
      
      // Refresh category data
      await loadCategory();
      
      setShowSubcategoryModal(false);
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'תת-הקטגוריה נמחקה בהצלחה',
        type: 'success'
      });
    } catch (error) {
      errorLog('Error deleting subcategory:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'מחיקת תת-הקטגוריה נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSubcategory = (item: Subcategory) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.subcategoryCard, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      }]}
      onPress={() => push(`/subcategory/${item.id}`)}
    >
      <View style={[styles.subcategoryIcon, { 
        backgroundColor: colors.interactive.secondary,
        borderColor: colors.gold 
      }]}>
        <Text style={styles.subcategoryEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.subcategoryName, { color: colors.text.primary }]}>{item.name}</Text>
      
      {isStoreOwner && (
        <View style={styles.adminActions}>
          <TouchableOpacity 
            style={styles.adminActionButton}
            onPress={(e) => {
              e.stopPropagation();
              editSubcategory(item);
            }}
          >
            <Pencil size={12} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>טוען...</Text>
          <View style={commonStyles.spacer24} />
        </View>
        <Spinner label="Loading category" />
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>קטגוריה לא נמצאה</Text>
          <View style={commonStyles.spacer24} />
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{category.name}</Text>
        <View style={styles.headerActions}>
          {isStoreOwner && (
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.gold }]} onPress={addSubcategory}>
              <Plus size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.subcategoriesContainer}
        showsVerticalScrollIndicator={false}
      >
        {subcategories.length > 0 ? (
          <View style={styles.subcategoriesGrid}>
            {subcategories.map(renderSubcategory)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{category.icon}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>אין תת-קטגוריות</Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {isStoreOwner ? 'הוסף תת-קטגוריות כדי להתחיל' : 'תת-קטגוריות יתווספו בקרוב'}
            </Text>
            {isStoreOwner && (
              <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.gold }]} onPress={addSubcategory}>
                <Plus size={20} color={colors.text.inverse} />
                <Text style={[styles.emptyButtonText, { color: colors.text.inverse }]}>הוסף תת-קטגוריה</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Subcategory Edit/Add Modal */}
      <Modal
        visible={showSubcategoryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSubcategoryModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingSubcategory ? 'עריכת תת-קטגוריה' : 'הוספת תת-קטגוריה חדשה'}
            </Text>
            <TouchableOpacity onPress={() => setShowSubcategoryModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מזהה תת-קטגוריה *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newSubcategory.id}
                onChangeText={(text) => setNewSubcategory({...newSubcategory, id: text})}
                placeholder="הכנס מזהה תת-קטגוריה (באנגלית)"
                textAlign="start"
                editable={!editingSubcategory} // Don't allow editing ID for existing subcategories
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>שם תת-הקטגוריה *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newSubcategory.name}
                onChangeText={(text) => setNewSubcategory({...newSubcategory, name: text})}
                placeholder="הכנס שם תת-קטגוריה"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>אייקון (אמוג'י) *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary, 
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newSubcategory.icon}
                onChangeText={(text) => setNewSubcategory({...newSubcategory, icon: text})}
                placeholder="הכנס אמוג'י (למשל: 💻)"
                textAlign="center"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveSubcategory}
                disabled={loading}
              >
                {loading ? (
                  <Spinner size="small" color={colors.text.inverse} style={styles.buttonSpinner} />
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור תת-קטגוריה</Text>
                  </>
                )}
              </TouchableOpacity>

              {editingSubcategory && (
                <TouchableOpacity 
                  style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                  onPress={() => deleteSubcategory(editingSubcategory.id)}
                  disabled={loading}
                >
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק תת-קטגוריה</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
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
    width: 40,
    alignItems: 'flex-end',
  },
  addButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  subcategoriesContainer: {
    padding: 16,
    minHeight: '100%',
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subcategoryCard: {
    width: '48%',
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    position: 'relative',
  },
  subcategoryIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  subcategoryEmoji: {
    fontSize: 40,
  },
  subcategoryName: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  adminActions: {
    position: 'absolute',
    top: 8,
    start: 8,
    flexDirection: 'row',
  },
  adminActionButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
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
    textAlign: 'right',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
  buttonSpinner: {
    marginRight: 8,
  },
});
