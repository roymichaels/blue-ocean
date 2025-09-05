import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/ui/ThemeProvider';
import { Product } from '../../../../types';
import { spacing, radius } from '@/shared/ui/tokens';
import { useProducts } from '@/services/useProducts';
import { ProductCard, ProductFormModal } from '@/features/products';
import { useAccountId } from '@/features/auth/services/nearAuth';
import { useAuth } from '@/features/auth/AuthContext';

const ITEM_HEIGHT = 200;

interface ProductItemProps {
  product: Product;
  onEdit: (p: Product) => void;
}

const ProductItem = React.memo(({ product, onEdit }: ProductItemProps) => (
  <TouchableOpacity
    style={{ marginBottom: spacing.spacer12 }}
    onPress={() => onEdit(product)}
  >
    <ProductCard key={product.id} product={product} />
  </TouchableOpacity>
));

export default function StoreProductsScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const {
    data: initialProducts = [],
    isLoading,
    refetch,
  } = useProducts(storeId || '');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const address = useAccountId();
  const { isStoreOwner } = useAuth();

  useEffect(() => {
    setProducts(initialProducts.filter((p) => p.storeId === storeId));
  }, [initialProducts, storeId]);

  const openForm = useCallback((p?: Product) => {
    setEditingProduct(p || null);
    setFormVisible(true);
  }, []);

  const handleSaved = useCallback((p: Product, isNew: boolean) => {
    if (isNew) {
      setProducts((prev) => [...prev, p]);
    } else {
      setProducts((prev) => prev.map((prod) => (prod.id === p.id ? p : prod)));
    }
  }, []);

  const handleDeleted = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductItem product={item} onEdit={openForm} />
    ),
    [openForm]
  );

  if (!isStoreOwner || address !== storeId) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={{ color: colors.text.primary }}>יש להתחבר לארנק המתאים</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <TouchableOpacity
        style={[styles.addButton, { borderColor: colors.border.primary }]}
        onPress={() => openForm()}
      >
        <Text style={{ color: colors.text.primary }}>הוסף מוצר</Text>
      </TouchableOpacity>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>אין מוצרים</Text>
        }
        contentContainerStyle={styles.list}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        removeClippedSubviews
        refreshing={isLoading}
        onRefresh={refetch}
      />
      <ProductFormModal
        visible={formVisible}
        product={editingProduct}
        onClose={() => setFormVisible(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.spacer16 },
  addButton: {
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.spacer16,
  },
  list: {
    paddingBottom: spacing.spacer24,
  },
});

