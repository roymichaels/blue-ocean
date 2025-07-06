import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Pencil, X, Save, Trash2, DollarSign, Percent, Package, Users } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import DatabaseService from '../../services/database';
import { PricingTier } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import InfoModal from '../../components/InfoModal';



export default function PricingTiersScreen() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [newTier, setNewTier] = useState<Partial<PricingTier>>({
    id: '',
    name: '',
    description: '',
    rules: [
      { minQty: 1, maxQty: 1, pricePerBaseUnit: undefined, discountPct: undefined } as any
    ]
  });
  const { isAdmin, isDriver } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  const validateRules = (rules: { minQty: number; maxQty: number; pricePerBaseUnit?: number; discountPct?: number; }[]): string | null => {
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

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      router.replace('/');
      return;
    }
    
    loadPricingTiers();
  }, [isAdmin, isDriver]);

  const loadPricingTiers = async () => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const tiersData = await db.getPricingTiers();
      setPricingTiers(tiersData);
    } catch (error) {
      console.error('Error loading pricing tiers:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת מדרגי המחירים נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const addTier = () => {
    setEditingTier(null);
    setNewTier({
      id: '',
      name: '',
      description: '',
      rules: [
        { minQty: 1, maxQty: 1, pricePerBaseUnit: undefined, discountPct: undefined } as any
      ]
    });
    setShowTierModal(true);
  };

  const editTier = (tier: PricingTier) => {
    setEditingTier(tier);
    setNewTier({...tier});
    setShowTierModal(true);
  };

  const saveTier = async () => {
    if (!newTier.id || !newTier.name || !newTier.description) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות הנדרשים',
        type: 'error'
      });
      return;
    }

    if (newTier.rules) {
      const errorMsg = validateRules(newTier.rules);
      if (errorMsg) {
        setInfoModal({ visible: true, title: 'שגיאה', message: errorMsg, type: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      
      if (editingTier) {
        // Update existing tier
        await db.updatePricingTier(editingTier.id, newTier);
        
        // Refresh tiers from database
        await loadPricingTiers();
        
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'מדרג המחירים עודכן בהצלחה',
          type: 'success'
        });
      } else {
        // Add new tier
        await db.addPricingTier(newTier as PricingTier);
        
        // Refresh tiers from database
        await loadPricingTiers();
        
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'מדרג המחירים נוסף בהצלחה',
          type: 'success'
        });
      }
      
      setShowTierModal(false);
    } catch (error) {
      console.error('Error saving pricing tier:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'שמירת מדרג המחירים נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTier = async (tierId: string) => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      await db.deletePricingTier(tierId);
      
      // Refresh tiers from database
      await loadPricingTiers();
      
      setShowTierModal(false);
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'מדרג המחירים נמחק בהצלחה',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting pricing tier:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'מחיקת מדרג המחירים נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderTierCard = (tier: PricingTier) => (
    <TouchableOpacity
      key={tier.id}
      style={[styles.tierCard, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      }]}
      onPress={() => editTier(tier)}
    >
      <View style={styles.tierHeader}>
        <View style={[styles.tierIcon, {
          backgroundColor: colors.interactive.secondary,
          borderColor: colors.gold
        }]}>
          {typeof (tier.rules?.[0]?.pricePerBaseUnit) === 'number' ? (
            <DollarSign size={24} color={colors.gold} />
          ) : (
            <Percent size={24} color={colors.gold} />
          )}
        </View>
        <View style={styles.tierInfo}>
          <Text style={[styles.tierName, { color: colors.text.primary }]}>{tier.name}</Text>
          <Text style={[styles.tierDiscount, { color: colors.gold }]}>
            {typeof (tier.rules?.[0]?.pricePerBaseUnit) === 'number'
              ? `${currencySymbol}${tier.rules![0].pricePerBaseUnit!.toFixed(2)} ליחידה`
              : 'מחיר רגיל'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={(e) => {
            e.stopPropagation();
            editTier(tier);
          }}
        >
          <Pencil size={16} color={colors.gold} />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.tierDetails, { borderTopColor: colors.border.secondary }]}>
        <View style={styles.tierDetailItem}>
          <Package size={16} color={colors.text.secondary} />
          <Text style={[styles.tierDetailText, { color: colors.text.secondary }]}>
            מינימום {tier.rules?.[0]?.minQty ?? 1} יחידות
          </Text>
        </View>
        <Text style={[styles.tierDescription, { color: colors.text.secondary }]}>
          {tier.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && pricingTiers.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>מדרגי מחירים</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.gold }]} onPress={addTier}>
              <Plus size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
        
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>מדרגי מחירים</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.gold }]} onPress={addTier}>
            <Plus size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.tiersContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>מדרגי מחירים</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            מדרגי מחירים מאפשרים לך להגדיר מחירים שונים לפי כמות הפריטים שנרכשים. 
            לדוגמה, אתה יכול להגדיר מחיר מיוחד של 8₪ ליחידה עבור רכישה של 5 פריטים ומעלה.
          </Text>
        </View>

        {pricingTiers.length > 0 ? (
          <View style={styles.tiersGrid}>
            {pricingTiers.map(renderTierCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <DollarSign size={80} color={colors.interactive.disabled} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>אין מדרגי מחירים</Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              הוסף מדרגי מחירים כדי להגדיר מחירים שונים לפי כמות
            </Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.gold }]} onPress={addTier}>
              <Plus size={20} color={colors.text.inverse} />
              <Text style={[styles.emptyButtonText, { color: colors.text.inverse }]}>הוסף מדרג מחירים</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Pricing Tier Edit/Add Modal */}
      <Modal
        visible={showTierModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowTierModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingTier ? 'עריכת מדרג מחירים' : 'הוספת מדרג מחירים חדש'}
            </Text>
            <TouchableOpacity onPress={() => setShowTierModal(false)}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>מזהה מדרג *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newTier.id}
                onChangeText={(text) => setNewTier({...newTier, id: text})}
                placeholder="הכנס מזהה מדרג (באנגלית, לדוגמה: bulk_discount)"
                textAlign="left"
                editable={!editingTier} // Don't allow editing ID for existing tiers
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>שם המדרג *</Text>
              <TextInput
                style={[styles.formInput, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newTier.name}
                onChangeText={(text) => setNewTier({...newTier, name: text})}
                placeholder="הכנס שם מדרג (לדוגמה: הנחת כמות)"
                textAlign="right"
              />
            </View>

            {newTier.rules?.map((rule, idx) => (
              <View key={idx} style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.formLabel, { color: colors.text.primary }]}>מינימום</Text>
                  <TextInput
                    style={[styles.formInput, {
                      borderColor: colors.border.primary,
                      backgroundColor: colors.surface.primary,
                      color: colors.text.primary
                    }]}
                    value={rule.minQty.toString()}
                    onChangeText={(text) => {
                      const updated = [...(newTier.rules || [])];
                      updated[idx].minQty = parseInt(text) || 1;
                      setNewTier({...newTier, rules: updated});
                    }}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.formLabel, { color: colors.text.primary }]}>מקסימום</Text>
                  <TextInput
                    style={[styles.formInput, {
                      borderColor: colors.border.primary,
                      backgroundColor: colors.surface.primary,
                      color: colors.text.primary
                    }]}
                    value={rule.maxQty.toString()}
                    onChangeText={(text) => {
                      const updated = [...(newTier.rules || [])];
                      updated[idx].maxQty = parseInt(text) || 0;
                      setNewTier({...newTier, rules: updated});
                    }}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.formLabel, { color: colors.text.primary }]}>מחיר ליחידה</Text>
                  <TextInput
                    style={[styles.formInput, {
                      borderColor: colors.border.primary,
                      backgroundColor: colors.surface.primary,
                      color: colors.text.primary
                    }]}
                    value={rule.pricePerBaseUnit?.toString() || ''}
                    onChangeText={(text) => {
                      const updated = [...(newTier.rules || [])];
                      updated[idx].pricePerBaseUnit = text ? parseFloat(text) : undefined;
                      setNewTier({...newTier, rules: updated});
                    }}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.formLabel, { color: colors.text.primary }]}>הנחה %</Text>
                  <TextInput
                    style={[styles.formInput, {
                      borderColor: colors.border.primary,
                      backgroundColor: colors.surface.primary,
                      color: colors.text.primary
                    }]}
                    value={rule.discountPct?.toString() || ''}
                    onChangeText={(text) => {
                      const updated = [...(newTier.rules || [])];
                      updated[idx].discountPct = text ? parseFloat(text) : undefined;
                      setNewTier({...newTier, rules: updated});
                    }}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                <TouchableOpacity onPress={() => {
                  const updated = [...(newTier.rules || [])];
                  updated.splice(idx,1);
                  setNewTier({...newTier, rules: updated});
                }}>
                  <Trash2 size={20} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}
              <TouchableOpacity onPress={() => setNewTier({
                ...newTier,
                rules: [
                  ...(newTier.rules || []),
                  {
                    id: '',
                    tierId: '',
                    minQty: 1,
                    maxQty: 1,
                    pricePerBaseUnit: undefined,
                    discountPct: undefined,
                  },
                ],
              })} style={{marginBottom:10}}>
              <Text style={{color: colors.gold}}>הוסף כלל</Text>
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.primary }]}>תיאור *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary 
                }]}
                value={newTier.description}
                onChangeText={(text) => setNewTier({...newTier, description: text})}
                placeholder="הכנס תיאור מדרג (לדוגמה: מחיר מיוחד של 8₪ ליחידה בקנייה של 5 פריטים ומעלה)"
                multiline
                numberOfLines={4}
                textAlign="right"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={saveTier}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="small" color={colors.text.inverse} style={styles.buttonSpinner} />
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
                  onPress={() => deleteTier(editingTier.id)}
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
  tiersContainer: {
    padding: 16,
    minHeight: '100%',
  },
  infoBox: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  tiersGrid: {
    gap: 16,
  },
  tierCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
      }
    }),
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'right',
  },
  tierDiscount: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  editButton: {
    padding: 8,
  },
  tierDetails: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  tierDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  tierDetailText: {
    fontSize: 14,
    marginRight: 8,
  },
  tierDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
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
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
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
  buttonSpinner: {
    marginRight: 8,
  },
});