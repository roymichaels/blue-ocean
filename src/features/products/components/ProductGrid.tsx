import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet, I18nManager, StyleProp, ViewStyle } from 'react-native';
import EmptyState from '@/shared/ui/EmptyState';
import ProductCard, { ProductCardSkeleton } from '../ProductCard';
import { Product } from '@/types';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Package } from 'lucide-react-native';
import { spacing } from '@/shared/ui/tokens';

const rowStyles = StyleSheet.create({ flex: { flex: 1 } });

const ProductRow = React.memo(
  ({
    item,
    borderColor,
    onProductPress,
  }: { item: Product; borderColor: string; onProductPress?: (product: Product) => void }) => (
    <View style={rowStyles.flex}>
      <ProductCard
        key={item.id}
        product={item}
        style={{ marginBottom: spacing.spacer12, borderColor }}
        onPress={onProductPress ? () => onProductPress(item) : undefined}
      />
    </View>
  )
);

interface ProductGridProps {
  products: Product[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onProductPress?: (product: Product) => void;
  loading?: boolean;
  skeletonCount?: number;
}

function ProductGrid({
  products,
  refreshing,
  onRefresh,
  onProductPress,
  loading,
  skeletonCount = 4,
}: ProductGridProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isRTL = I18nManager.isRTL;

  const borderColor = colors.border.primary;
  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow item={item} borderColor={borderColor} onProductPress={onProductPress} />
    ),
    [borderColor, onProductPress]
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const columnWrapperStyle = useMemo(
    () => ({
      gap: spacing.spacer12,
      paddingHorizontal: spacing.spacer16,
      flexDirection: (isRTL ? 'row-reverse' : 'row') as ViewStyle['flexDirection'],
    }),
    [isRTL]
  );
  const contentContainerStyle = useMemo(
    () => ({
      paddingVertical: spacing.spacer16,
      direction: (isRTL ? 'rtl' : 'ltr') as ViewStyle['direction'],
    }),
    [isRTL]
  );
  const skeletonItems = useMemo(
    () => Array.from({ length: skeletonCount }, (_, index) => index),
    [skeletonCount]
  );

  if (loading && (!products || products.length === 0)) {
    return (
      <View
        style={[
          styles.skeletonGrid,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        accessibilityLabel={t('home.loadingProducts', 'Loading products')}
      >
        {skeletonItems.map((index) => (
          <View key={index} style={styles.skeletonWrapper}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t('subcategory.noProducts')}
        message={t('home.productsComingSoon')}
      />
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={keyExtractor}
      numColumns={2}
      style={{ direction: (isRTL ? 'rtl' : 'ltr') as ViewStyle['direction'] }}
      columnWrapperStyle={columnWrapperStyle}
      contentContainerStyle={contentContainerStyle}
      renderItem={renderItem}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}

export default memo(ProductGrid);

const styles = StyleSheet.create({
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer16,
  },
  skeletonWrapper: {
    width: '48%',
  },
});


