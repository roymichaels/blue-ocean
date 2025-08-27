import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../contexts/ThemeContext';
import { listProducts } from '../../../../services/tonProducts';
import { Product } from '../../../../types';
import ProductCard from '../../../../components/ProductCard';
import ProductFormModal from '../../../../components/ProductFormModal';
import { useAccountId } from '../../../../services/nearAuth';
import { useAuth } from '../../../../components/AuthContext';

const ITEM_HEIGHT = 200;

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
      if (!storeId || !isStoreOwner || address !== storeId) return;
      const all = await listProducts();
      setProducts(all.filter((p) => p.storeId === storeId));
    };
    load();
  }, [storeId, address, isStoreOwner]);

  const openForm = (p?: Product) => {
    setEditingProduct(p || null);
    setFormVisible(true);
  };

  const handleSaved = (p: Product, isNew: boolean) => {
    if (isNew) {
      setProducts((prev) => [...prev, p]);
    } else {
      setProducts((prev) => prev.map((prod) => (prod.id === p.id ? p : prod)));
    }
  };

  const handleDeleted = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

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
        renderItem={({ item: p }) => (
          <TouchableOpacity style={{ marginBottom: 12 }}>
            <ProductCard
              product={p}
              isOwner
              onEdit={() => openForm(p)}
              onDelete={(id) => handleDeleted(id)}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>אין מוצרים</Text>
        }
        contentContainerStyle={styles.list}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
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

