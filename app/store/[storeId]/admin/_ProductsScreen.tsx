import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/ui/ThemeProvider';
import type { Product } from '@/types';
import { useProducts } from '@/hooks/useProducts';
import { productsWarmCache } from '@/features/products/services/nearProducts';
import { useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui/primitives';
import DatabaseService from '@/services/database';
import { ProductFormModal } from '@/features/products';

interface ProductRowProps {
  product: Product;
  colors: any;
  busy: boolean;
  onEdit: (product: Product) => void;
  onToggle: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const LOW_STOCK_THRESHOLD = 5;

function ProductRow({ product, colors, busy, onEdit, onToggle, onDelete }: ProductRowProps) {
  const isActive = product.isActive !== false;
  const stock = product.stock ?? 0;
  const price = Number.isFinite(product.price) ? product.price : Number(product.price ?? 0);
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: colors.border.primary,
          backgroundColor: colors.surface.primary,
          opacity: busy ? 0.5 : 1,
        },
      ]}>
      <View style={styles.rowInfo}>
        <Text style={[styles.productName, { color: colors.text.primary }]}>{product.name}</Text>
        <Text style={{ color: colors.text.secondary }}>
          ₪{price.toLocaleString('he-IL')} · מלאי {stock}
        </Text>
        {!isActive && (
          <Text style={[styles.statusBadge, { color: colors.status.error }]}>מושבת</Text>
        )}
        {stock <= LOW_STOCK_THRESHOLD && isActive ? (
          <Text style={[styles.statusBadge, { color: colors.status.warning }]}>מלאי נמוך</Text>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.actionButton, { borderColor: colors.border.primary }]}
          onPress={() => onEdit(product)}
          disabled={busy}>
          <Text style={{ color: colors.text.primary }}>עריכה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.actionButton, { borderColor: colors.border.primary }]}
          onPress={() => onToggle(product)}
          disabled={busy}>
          <Text style={{ color: colors.text.primary }}>{isActive ? 'השהה' : 'הפעל'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.deleteButton, { borderColor: colors.status.error }]}
          onPress={() => onDelete(product)}
          disabled={busy}>
          <Text style={{ color: colors.status.error }}>מחק</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StoreProductsScreen(): React.ReactElement {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const db = useMemo(() => DatabaseService.getInstance(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const {
    data: fetchedProducts = [],
    isLoading,
    isRefetching,
    refetch,
  } = useProducts(storeId ?? null);

  useEffect(() => {
    if (!storeId) return;
    setProducts(
      fetchedProducts
        .filter((product) => product.storeId === storeId)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [fetchedProducts, storeId]);

  useEffect(() => {
    if (!storeId) return;
    const unsubscribe = productsWarmCache.subscribe(
      (_, product) => {
        if (!storeId) return false;
        if (!product) return true;
        return product.storeId === storeId;
      },
      (id, product) => {
        setProducts((prev) => {
          if (!product) {
            return prev.filter((item) => item.id !== id);
          }
          if (product.storeId !== storeId) return prev;
          const next = prev.some((item) => item.id === id)
            ? prev.map((item) => (item.id === id ? product : item))
            : [...prev, product];
          return next
            .filter((item) => item.storeId === storeId)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      },
    );
    return () => unsubscribe?.();
  }, [storeId]);

  const openForm = useCallback(
    (product?: Product) => {
      setSelectedProduct(product ?? null);
      setFormVisible(true);
    },
    [],
  );

  const handleToggle = useCallback(
    async (product: Product) => {
      if (!storeId) return;
      const nextActive = product.isActive === false;
      setPendingActionId(product.id);
      const original = product;
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, isActive: nextActive } : item,
        ),
      );
      try {
        await db.updateProduct(product.id, { isActive: nextActive });
        productsWarmCache.mutate({
          id: product.id,
          value: { ...original, isActive: nextActive },
          ts: Date.now(),
        });
        await refetch();
      } catch (error) {
        setProducts((prev) =>
          prev.map((item) => (item.id === original.id ? original : item)),
        );
        Alert.alert('שגיאה', 'עדכון סטטוס המוצר נכשל');
      } finally {
        setPendingActionId(null);
      }
    },
    [db, refetch, storeId],
  );

  const confirmDelete = useCallback(
    (product: Product) => {
      Alert.alert('מחיקת מוצר', `האם למחוק את "${product.name}"?`, [
        { text: 'בטל', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            setPendingActionId(product.id);
            try {
              await db.deleteProduct(product.id);
              setProducts((prev) => prev.filter((item) => item.id !== product.id));
              productsWarmCache.mutate({ id: product.id, op: 'delete', ts: Date.now() });
              await refetch();
            } catch (error) {
              Alert.alert('שגיאה', 'מחיקת המוצר נכשלה');
            } finally {
              setPendingActionId(null);
            }
          },
        },
      ]);
    },
    [db, refetch],
  );

  const handleSaved = useCallback((saved: Product, isNew: boolean) => {
    setProducts((prev) => {
      const next = isNew
        ? [...prev, saved]
        : prev.map((item) => (item.id === saved.id ? saved : item));
      return next
        .filter((item) => item.storeId === saved.storeId)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    productsWarmCache.mutate({ id: saved.id, value: saved, ts: Date.now() });
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
    productsWarmCache.mutate({ id, op: 'delete', ts: Date.now() });
  }, []);

  const refreshing = isLoading || isRefetching;

  if (!storeId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.primary }}>יש לבחור חנות לניהול מוצרים.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.primaryButton, { borderColor: colors.border.primary }]}
        onPress={() => openForm()}
        accessibilityRole="button">
        <Text style={{ color: colors.text.primary }}>הוסף מוצר חדש</Text>
      </TouchableOpacity>

      {isLoading && products.length === 0 ? (
        <View style={styles.centered}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              colors={colors}
              busy={pendingActionId === item.id}
              onEdit={openForm}
              onToggle={handleToggle}
              onDelete={confirmDelete}
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
              {t('products.empty', 'אין מוצרים להצגה')}
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.text.primary} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <ProductFormModal
        visible={formVisible}
        product={selectedProduct}
        onClose={() => setFormVisible(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  listContent: { paddingBottom: 32, gap: 12 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  rowInfo: { gap: 4 },
  productName: { fontSize: 16, fontWeight: '600' },
  statusBadge: { fontSize: 12, fontWeight: '600' },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
