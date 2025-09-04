import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppRouter from 'hooks/useAppRouter';
import {
  ArrowLeft,
  Plus,
  Pencil,
  DollarSign,
  Percent,
  Package,
} from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import DatabaseService from '@/services/database';
import { PricingTier } from '../../../../types';
import { Spinner } from '@/ui/primitives';
import InfoModal from '../../../../components/InfoModal';
import PricingTierFormModal from '@/features/products/components/PricingTierFormModal';
import Card from '@/ui/primitives/Card';

export default function PricingTiersScreen() {
  const { replace, back } = useAppRouter();
  const { isAdmin, isDriver } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();

  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      replace('/');
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
      errorLog('Error loading pricing tiers:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת מדרגי המחירים נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const addTier = () => {
    setEditingTier(null);
    setShowTierModal(true);
  };

  const editTier = (tier: PricingTier) => {
    setEditingTier(tier);
    setShowTierModal(true);
  };

  const renderTierCard = (tier: PricingTier) => (
    <TouchableOpacity key={tier.id} onPress={() => editTier(tier)}>
      <Card
        style={[
          styles.tierCard,
          {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary,
          },
        ]}
      >
      <View style={styles.tierHeader}>
        <View
          style={[
            styles.tierIcon,
            {
              backgroundColor: colors.interactive.secondary,
              borderColor: colors.gold,
            },
          ]}
        >
          {typeof tier.rules?.[0]?.pricePerBaseUnit === 'number' ? (
            <DollarSign size={24} color={colors.gold} />
          ) : (
            <Percent size={24} color={colors.gold} />
          )}
        </View>
        <View style={styles.tierInfo}>
          <Text style={[styles.tierName, { color: colors.text.primary }]}>
            {tier.name}
          </Text>
          <Text style={[styles.tierDiscount, { color: colors.gold }]}>
            {typeof tier.rules?.[0]?.pricePerBaseUnit === 'number'
              ? `${currencySymbol}${tier.rules![0].pricePerBaseUnit!.toFixed(
                  2
                )} ליחידה`
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

      <View
        style={[
          styles.tierDetails,
          { borderTopColor: colors.border.secondary },
        ]}
      >
        <View style={styles.tierDetailItem}>
          <Package size={16} color={colors.text.secondary} />
          <Text
            style={[styles.tierDetailText, { color: colors.text.secondary }]}
          >
            מינימום {tier.rules?.[0]?.minQty ?? 1} יחידות
          </Text>
        </View>
        <Text
          style={[styles.tierDescription, { color: colors.text.secondary }]}
        >
          {tier.description}
        </Text>
      </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading && pricingTiers.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.border.primary }]}
        >
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            מדרגי מחירים
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.gold }]}
              onPress={addTier}
            >
              <Plus size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>

        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[styles.header, { borderBottomColor: colors.border.primary }]}
      >
        <TouchableOpacity onPress={() => back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          מדרגי מחירים
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.gold }]}
            onPress={addTier}
          >
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
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
            מדרגי מחירים
          </Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            מדרגי מחירים מאפשרים לך להגדיר מחירים שונים לפי כמות הפריטים
            שנרכשים. לדוגמה, אתה יכול להגדיר מחיר מיוחד של 8₪ ליחידה עבור רכישה
            של 5 פריטים ומעלה.
          </Text>
        </View>

        {pricingTiers.length > 0 ? (
          <View style={styles.tiersGrid}>
            {(pricingTiers || []).map(renderTierCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <DollarSign size={80} color={colors.interactive.disabled} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              אין מדרגי מחירים
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              הוסף מדרגי מחירים כדי להגדיר מחירים שונים לפי כמות
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.gold }]}
              onPress={addTier}
            >
              <Plus size={20} color={colors.text.inverse} />
              <Text
                style={[styles.emptyButtonText, { color: colors.text.inverse }]}
              >
                הוסף מדרג מחירים
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <PricingTierFormModal
        visible={showTierModal}
        tier={editingTier}
        onClose={() => setShowTierModal(false)}
        onSaved={loadPricingTiers}
        onDeleted={loadPricingTiers}
      />

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerActions: { width: 40, alignItems: 'flex-end' },
  addButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: { flex: 1 },
  tiersContainer: { padding: 16, minHeight: '100%' },
  infoBox: { marginBottom: 24 },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  infoText: { fontSize: 14, lineHeight: 20, textAlign: 'right' },
  tiersGrid: { gap: 16 },
  tierCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  tierInfo: { flex: 1 },
  tierName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'right',
  },
  tierDiscount: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  editButton: { padding: 8 },
  tierDetails: { borderTopWidth: 1, paddingTop: 12 },
  tierDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  tierDetailText: { fontSize: 14, marginRight: 8 },
  tierDescription: { fontSize: 14, lineHeight: 20, textAlign: 'right' },
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
  emptyText: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  emptyButton: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
