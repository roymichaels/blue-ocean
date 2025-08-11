import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { listProducts } from '../../../services/tonProducts';
import { Product } from '../../../types';
import ProductCard from '../../../components/ProductCard';
import ProductFormModal from '../../../components/ProductFormModal';
import { useTonAddress } from '../../../services/tonAuth';

export default function StoreProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const address = useTonAddress();

  useEffect(() => {
    const load = async () => {
      if (!id || address !== id) return;
      const all = await listProducts();
      setProducts(all.filter((p) => p.storeId === id));
    };
    load();
  }, [id, address]);

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

  if (address !== id) {
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
      <ScrollView contentContainerStyle={styles.list}>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            isAdmin
            onEdit={() => openForm(p)}
            onDelete={(id) => handleDeleted(id)}
            style={{ marginBottom: 12 }}
          />
        ))}
        {products.length === 0 && (
          <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>אין מוצרים</Text>
        )}
      </ScrollView>
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

