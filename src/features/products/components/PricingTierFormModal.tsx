import { errorLog } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X, Save, Trash2 } from 'lucide-react-native';
import { PricingTier, PricingTierRule } from '@/types';
import { useTheme } from '@/ui/ThemeProvider';
import DatabaseService from '@/services/database';
import InfoModal from '@/components/InfoModal';
import { Spinner } from '@/ui/primitives';
import LabeledInput from '@/components/form/LabeledInput';

interface PricingTierFormModalProps {
  visible: boolean;
  onClose: () => void;
  tier?: PricingTier | null;
  onSaved?: (tier: PricingTier, isNew: boolean) => void;
  onDeleted?: (id: string) => void;
}

const createEmptyRule = (): PricingTierRule => ({
  id: '',
  tierId: '',
  minQty: 1,
  maxQty: 1,
  pricePerBaseUnit: undefined,
  discountPct: undefined,
});

export default function PricingTierFormModal({
  visible,
  onClose,
  tier,
  onSaved,
  onDeleted,
}: PricingTierFormModalProps) {
  const { colors } = useTheme();
  const [editingTier, setEditingTier] = useState<PricingTier | null>(tier ?? null);
  const [formData, setFormData] = useState<Partial<PricingTier>>({
    id: '',
    name: '',
    description: '',
    rules: [createEmptyRule()],
  });
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const updateFormData = useCallback(
    <K extends keyof PricingTier>(key: K, value: Partial<PricingTier>[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );
  const updateRuleField = useCallback(
    <K extends keyof PricingTierRule>(index: number, key: K, value: PricingTierRule[K]) => {
      setFormData((prev) => {
        const rules = [...(prev.rules || [])];
        if (!rules[index]) {
          return prev;
        }
        rules[index] = { ...rules[index], [key]: value };
        return { ...prev, rules };
      });
    },
    [],
  );
  const removeRule = useCallback((index: number) => {
    setFormData((prev) => {
      const rules = [...(prev.rules || [])];
      rules.splice(index, 1);
      return { ...prev, rules };
    });
  }, []);

  useEffect(() => {
    if (visible) {
      setEditingTier(tier ?? null);
      if (tier) {
        setFormData({ ...tier });
      } else {
        setFormData({
          id: '',
          name: '',
          description: '',
          rules: [createEmptyRule()],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tier]);

  const validateRules = (
    rules: { minQty: number; maxQty: number; pricePerBaseUnit?: number; discountPct?: number }[],
  ): string | null => {
    const sorted = [...rules].sort((a, b) => a.minQty - b.minQty);
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (r.minQty < 1) return 'כמות מינימלית חייבת להיות מספר גדול מ-0';
      if (r.maxQty < r.minQty) return 'ערך מקסימום חייב להיות גדול או שווה למינימום';
      if (r.pricePerBaseUnit == null && r.discountPct == null) return 'יש להזין מחיר או הנחה לכל כלל';
      if (i > 0) {
        const prev = sorted[i - 1];
        if (r.minQty !== prev.maxQty + 1) return 'טווחי הכמויות חופפים או מכילים חוסרים';
      }
    }
    return null;
  };

  const saveTier = async () => {
    if (!formData.id || !formData.name || !formData.description) {
      setInfoModal({ visible: true, title: 'שגיאה', message: 'אנא מלא את כל השדות הנדרשים', type: 'error' });
      return;
    }

    if (formData.rules) {
      const errorMsg = validateRules(formData.rules);
      if (errorMsg) {
        setInfoModal({ visible: true, title: 'שגיאה', message: errorMsg, type: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      if (editingTier) {
        await db.updatePricingTier(editingTier.id, formData);
        const updated = { ...editingTier, ...formData } as PricingTier;
        onSaved?.(updated, false);
      } else {
        await db.addPricingTier(formData as PricingTier);
        const added = formData as PricingTier;
        onSaved?.(added, true);
      }
      onClose();
    } catch (error) {
      errorLog('Error saving pricing tier:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'שמירת מדרג המחירים נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTier = async () => {
    if (!editingTier) return;
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deletePricingTier(editingTier.id);
      onDeleted?.(editingTier.id);
      onClose();
    } catch (error) {
      errorLog('Error deleting pricing tier:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'מחיקת מדרג המחירים נכשלה',
        type: 'error',
      });
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
              {editingTier ? 'עריכת מדרג מחירים' : 'הוספת מדרג מחירים חדש'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <LabeledInput
              label="מזהה מדרג *"
              value={formData.id ?? ''}
              onChangeText={(text) => updateFormData('id', text)}
              placeholder="הכנס מזהה מדרג (באנגלית, לדוגמה: bulk_discount)"
              editable={!editingTier}
              labelStyle={styles.fieldLabel}
            />

            <LabeledInput
              label="שם המדרג *"
              value={formData.name ?? ''}
              onChangeText={(text) => updateFormData('name', text)}
              placeholder="הכנס שם מדרג (לדוגמה: הנחת כמות)"
              labelStyle={styles.fieldLabel}
            />

            {formData.rules?.map((rule, idx) => (
              <View key={idx} style={styles.formRow}>
                <LabeledInput
                  label="מינימום"
                  value={rule.minQty.toString()}
                  onChangeText={(text) =>
                    updateRuleField(idx, 'minQty', Number.parseInt(text, 10) || 1)
                  }
                  keyboardType="numeric"
                  containerStyle={styles.formGroupHalf}
                  labelStyle={styles.fieldLabel}
                />
                <LabeledInput
                  label="מקסימום"
                  value={rule.maxQty.toString()}
                  onChangeText={(text) =>
                    updateRuleField(idx, 'maxQty', Number.parseInt(text, 10) || 0)
                  }
                  keyboardType="numeric"
                  containerStyle={styles.formGroupHalf}
                  labelStyle={styles.fieldLabel}
                />
                <LabeledInput
                  label="מחיר ליחידה"
                  value={rule.pricePerBaseUnit?.toString() || ''}
                  onChangeText={(text) =>
                    updateRuleField(
                      idx,
                      'pricePerBaseUnit',
                      text ? Number.parseFloat(text) : undefined,
                    )
                  }
                  keyboardType="numeric"
                  containerStyle={styles.formGroupHalf}
                  labelStyle={styles.fieldLabel}
                />
                <LabeledInput
                  label="הנחה %"
                  value={rule.discountPct?.toString() || ''}
                  onChangeText={(text) =>
                    updateRuleField(
                      idx,
                      'discountPct',
                      text ? Number.parseFloat(text) : undefined,
                    )
                  }
                  keyboardType="numeric"
                  containerStyle={styles.formGroupHalf}
                  labelStyle={styles.fieldLabel}
                />
                <TouchableOpacity onPress={() => removeRule(idx)}>
                  <Trash2 size={20} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() =>
                setFormData((prev) => ({
                  ...prev,
                  rules: [...(prev.rules || []), createEmptyRule()],
                }))
              }
              style={styles.addRuleButton}
            >
              <Text style={[styles.addRuleText, { color: colors.gold }]}>הוסף כלל</Text>
            </TouchableOpacity>

            <LabeledInput
              label="תיאור *"
              value={formData.description ?? ''}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="הכנס תיאור מדרג (לדוגמה: מחיר מיוחד של 8₪ ליחידה בקנייה של 5 פריטים ומעלה)"
              multiline
              numberOfLines={4}
              labelStyle={styles.fieldLabel}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveTier}
                disabled={loading}
              >
                {loading ? (
                <Spinner size="small" color={colors.text.inverse} style={styles.buttonSpinner} />
                ) : (
                  <>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור מדרג מחירים</Text>
                  </>
                )}
              </TouchableOpacity>

              {editingTier && (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.status.error }]}
                  onPress={deleteTier}
                  disabled={loading}
                >
                  <Trash2 size={20} color={colors.text.inverse} />
                  <Text style={[styles.deleteButtonText, { color: colors.text.inverse }]}>מחק מדרג מחירים</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
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
  formRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  formGroupHalf: { flex: 1 },
  fieldLabel: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  addRuleButton: { marginBottom: 10 },
  addRuleText: { fontWeight: '600' },
  modalActions: { gap: 16, marginTop: 20, marginBottom: 40 },
  saveButton: { borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  deleteButton: { borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  buttonSpinner: { marginRight: 8 },
});
