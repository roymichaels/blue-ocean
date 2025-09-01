import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Pencil, X, Save, Trash2 } from 'lucide-react-native';
import DatabaseService from '../../services/database';
import { Category } from '../../types';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GlobalHeader from '../../components/GlobalHeader';
import InfoModal from '../../components/InfoModal';
import Spinner from '../../components/ui/Spinner';
import AppShell from '../../components/layout/AppShell';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    id: '',
    name: '',
    icon: '',
  });
  const [loading, setLoading] = useState(true);
  const { isStoreOwner } = useAuth();
  const { colors } = useTheme();
  const NUM_COLUMNS = 2;
  const ITEM_HEIGHT = 176;
  const getItemLayout = (_: Category[] | null | undefined, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
    index,
  });

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const categoriesData = await db.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      errorLog('Error loading categories:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת הקטגוריות נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    setEditingCategory(null);
    setNewCategory({
      id: '',
      name: '',
      icon: '',
    });
    setShowCategoryModal(true);
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({ ...category });
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!newCategory.name || !newCategory.icon || !newCategory.id) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const db = DatabaseService.getInstance();

      if (editingCategory) {
        // Update existing category
        await db.updateCategory(editingCategory.id, newCategory);

        // Refresh categories from database
        await loadCategories();

        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'הקטגוריה עודכנה בהצלחה',
          type: 'success',
        });
      } else {
        // Add new category
        await db.addCategory(newCategory as Omit<Category, 'subcategories'>);

        // Refresh categories from database
        await loadCategories();

        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'הקטגוריה נוספה בהצלחה',
          type: 'success',
        });
      }

      setShowCategoryModal(false);
    } catch (error) {
      errorLog('Error saving category:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message:
          error instanceof Error ? error.message : 'שמירת הקטגוריה נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deleteCategory(categoryId);

      // Refresh categories from database
      await loadCategories();

      setShowCategoryModal(false);
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'הקטגוריה נמחקה בהצלחה',
        type: 'success',
      });
    } catch (error) {
      errorLog('Error deleting category:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message:
          error instanceof Error ? error.message : 'מחיקת הקטגוריה נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard]}
      onPress={() => router.push(`/category/${item.id}`)}
    >
      <View style={[styles.categoryIcon]}>
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: colors.text.primary }]}>
        {item.name}
      </Text>

      {isStoreOwner && (
        <View style={styles.adminActions}>
          <TouchableOpacity
            style={styles.adminActionButton}
            onPress={(e) => {
              e.stopPropagation();
              editCategory(item);
            }}
          >
            <Pencil size={12} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && categories.length === 0) {
    return (
      <AppShell showSearch={false}>
        <View
          style={[styles.header, { borderBottomColor: colors.border.primary }]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>קטגוריות</Text>
          <View style={styles.headerActions}>
            {isStoreOwner && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.gold }]}
                onPress={addCategory}
              >
                <Plus size={20} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Spinner label="Loading categories" />
        </View>
      </AppShell>
    );
  }

  const fallbackCategories: Category[] = [
    { id: 'electronics', name: 'Electronics', icon: '📱' } as any,
    { id: 'fashion', name: 'Fashion', icon: '👗' } as any,
    { id: 'home', name: 'Home', icon: '🏠' } as any,
    { id: 'beauty', name: 'Beauty', icon: '💄' } as any,
    { id: 'sports', name: 'Sports', icon: '🏀' } as any,
    { id: 'books', name: 'Books', icon: '📚' } as any,
  ];

  return (
    <AppShell showSearch={false}>

      <View
        style={[styles.header, { borderBottomColor: colors.border.primary }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          קטגוריות
        </Text>
        <View style={styles.headerActions}>
          {isStoreOwner && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.gold }]}
              onPress={addCategory}
            >
              <Plus size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={categories.length ? categories : fallbackCategories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.categoryWrapper}>{renderCategory({ item })}</View>
        )}
        numColumns={NUM_COLUMNS}
        style={styles.scrollContainer}
        contentContainerStyle={styles.categoriesContainer}
        columnWrapperStyle={styles.categoriesGrid}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
      />

      {/* Category Edit/Add Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCategoryModal(false)}
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
              {editingCategory ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'}
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>
                מזהה קטגוריה *
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
                value={newCategory.id}
                onChangeText={(text) =>
                  setNewCategory({ ...newCategory, id: text })
                }
                placeholder="הכנס מזהה קטגוריה (באנגלית)"
                textAlign="start"
                editable={!editingCategory} // Don't allow editing ID for existing categories
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>
                שם הקטגוריה *
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
                value={newCategory.name}
                onChangeText={(text) =>
                  setNewCategory({ ...newCategory, name: text })
                }
                placeholder="הכנס שם קטגוריה"
                textAlign="end"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>
                אייקון (אמוג'י) *
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
                value={newCategory.icon}
                onChangeText={(text) =>
                  setNewCategory({ ...newCategory, icon: text })
                }
                placeholder="הכנס אמוג'י (למשל: 📱)"
                textAlign="center"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveCategory}
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
                      שמור קטגוריה
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {editingCategory && (
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    { backgroundColor: colors.status.error },
                  ]}
                  onPress={() => deleteCategory(editingCategory.id)}
                  disabled={loading}
                >
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text
                    style={[
                      styles.deleteButtonText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    מחק קטגוריה
                  </Text>
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
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />
    </AppShell>
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
  categoriesContainer: {
    padding: 16,
    minHeight: '100%',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryWrapper: {
    width: '48%',
    marginBottom: 24,
  },
  categoryCard: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    position: 'relative',
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 40,
  },
  categoryName: {
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
