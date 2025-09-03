import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProductCard, { ProductCardSkeleton } from '@/components/ui/ProductCard';
import { Product, Category } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import EmptyState from '@/shared/ui/EmptyState';
import { Filter, Plus } from 'lucide-react-native';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  isStoreOwner: boolean;
  onEdit: (product: Product) => void;
  getItemWidth: () => string;
  searchQuery: string;
  onAddProduct: () => void;
  loading?: boolean;
}

export default function ProductGrid({
  products,
  categories,
  isStoreOwner,
  onEdit,
  getItemWidth,
  searchQuery,
  onAddProduct,
  loading,
}: ProductGridProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <View style={styles.productsGrid}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={idx} style={[styles.productWrapper, { width: getItemWidth() }]}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={searchQuery ? Filter : Plus}
        title={searchQuery ? t('home.noResults') : t('home.noProducts')}
        message={
          searchQuery
            ? t('home.tryDifferentSearch')
            : t('home.productsComingSoon')
        }
        actionText={
          isStoreOwner && !searchQuery ? t('subcategory.addProduct') : undefined
        }
        onAction={isStoreOwner && !searchQuery ? onAddProduct : undefined}
      />
    );
  }

  return (
    <View style={styles.productsGrid}>
      {products.map((item) => (
        <View
          key={item.id}
          style={[styles.productWrapper, { width: getItemWidth() }]}
        >
          <ProductCard
            product={item}
            isOwner={isStoreOwner}
            onEdit={onEdit}
            subcategoryName={
              categories
                .flatMap((c) => c.subcategories || [])
                .find((s) => s.id === item.subcategory)?.name
            }
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productWrapper: {
    marginBottom: 16,
  },
});

