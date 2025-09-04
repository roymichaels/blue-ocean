import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { Subcategory } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubcategoryPickerProps {
  visible: boolean;
  subcategories: Subcategory[];
  onSelect: (id: string) => void;
  onAdd?: () => void;
  onClose: () => void;
}

export default function SubcategoryPicker({
  visible,
  subcategories,
  onSelect,
  onAdd,
  onClose,
}: SubcategoryPickerProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface.elevated }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('category.selectSubcategory')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list}>
            {subcategories.length > 0 ? (
              subcategories.map(sub => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.item, { borderBottomColor: colors.border.secondary }]}
                  onPress={() => onSelect(sub.id)}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemIcon}>{sub.icon}</Text>
                    <Text style={[styles.itemText, { color: colors.text.primary }]}>{sub.name}</Text>
                  </View>
                  <Text style={[styles.itemId, { color: colors.text.tertiary }]}>{sub.id}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.itemContent}>
                <Text style={[styles.itemText, { color: colors.text.secondary }]}>
                  {t('category.noSubcategoriesAvailable')}
                </Text>
              </View>
            )}
            {onAdd && (
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: colors.border.secondary, backgroundColor: colors.interactive.secondary }]}
                onPress={onAdd}
              >
                <View style={styles.itemContent}>
                  <Plus size={20} color={colors.gold} />
                  <Text style={[styles.itemText, { color: colors.gold }]}>
                    {t('category.addNewSubcategory')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold' },
  list: { maxHeight: 400 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  itemContent: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { fontSize: 24, marginRight: 12 },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemId: { fontSize: 12 },
});
