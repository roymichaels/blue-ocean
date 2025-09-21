import React from 'react';
import { FlatList, ListRenderItemInfo, Text, View } from 'react-native';
import { Screen } from '@/ui/layout/Screen';
import { useFeed } from '@/logic/hooks/useFeed';
import type { Store } from '@/data/commerce';
import { StoreCard } from '@/ui/components/StoreCard';
import { SectionHeader } from '@/ui/components/SectionHeader';
import { ProductCard } from '@/ui/components/ProductCard';
import { Skeleton } from '@/ui/components/Skeleton';
import { Chip } from '@/ui/components/Chip';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { EmptyState } from '@/ui/components/EmptyState';

export default function HomeScreen() {
  const { data, status, refresh, error } = useFeed();
  const { colors, typography, spacing } = useTheme();

  if (status === 'loading' && !data) {
    return (
      <Screen scrollable>
        <Skeleton height={220} />
        <Skeleton height={60} />
        <Skeleton height={220} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scrollable>
        <EmptyState title="We lost the signal" description={error.message} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen scrollable>
        <EmptyState title="Nothing yet" description="Add a store or switch to mock mode to explore the experience." />
      </Screen>
    );
  }

  const renderStore = ({ item }: ListRenderItemInfo<Store>) => <StoreCard store={item} />;

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: typography.small }}>Featured</Text>
        <StoreCard store={data.heroStore} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Quick filters" />
        <FlatList
          data={data.quickCategories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => <Chip label={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: spacing.xs }} />}
          contentContainerStyle={{ paddingHorizontal: spacing.sm }}
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Trending today" />
        <FlatList
          data={data.trendingProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          contentContainerStyle={{ paddingHorizontal: spacing.sm }}
        />
      </View>
      <SectionHeader title="Nearby gems" />
    </View>
  );

  return (
    <Screen padded={false} scrollable={false}>
      <FlatList
        data={data.featuredStores}
        keyExtractor={(item) => item.id}
        renderItem={renderStore}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
        ListHeaderComponent={header}
        refreshing={status === 'loading'}
        onRefresh={refresh}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
