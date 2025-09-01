import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../contexts/ThemeContext';
import chain from '../../../../services/chain';
import { Product } from '../../../../types';

let listProducts: (() => Promise<Product[]>) | undefined;
if (chain === 'near') {
  ({ listProducts } = require('@/features/products/services/nearProducts'));
}
import ProductCard from '@/features/products/components/ProductCard';
import ProductFormModal from '@/features/products/components/ProductFormModal';
import { useAccountId } from '@/features/auth/services/nearAuth';
import { useAuth } from '@/features/auth/AuthContext';

const ITEM_HEIGHT = 200;

interface ProductItemProps {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}

const ProductItem = React.memo(({ product, onEdit, onDelete }: ProductItemProps) => (
  <TouchableOpacity style={{ marginBottom: 12 }}>
    <ProductCard
      product={product}
      isOwner
      onEdit={() => onEdit(product)}
      onDelete={onDelete}
    />
  </TouchableOpacity>
));

export default function StoreProductsScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const address = useAccountId();
  const { isStoreOwner } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!storeId || !isStoreOwner || address !== storeId || !listProducts) return;
      const all = await listProducts();
      setProducts(all.filter((p) => p.storeId === storeId));
    };
    load();
  }, [storeId, address, isStoreOwner]);

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
      <ProductItem product={item} onEdit={openForm} onDelete={handleDeleted} />
    ),
    [openForm, handleDeleted]
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
  container: { flex: 1, padding: 16 },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
});

