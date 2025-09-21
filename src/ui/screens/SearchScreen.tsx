import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, SectionListData, Text, TextInput, View } from 'react-native';
import { Screen } from '@/ui/layout/Screen';
import { useSearch } from '@/logic/hooks/useSearch';
import { useFeed } from '@/logic/hooks/useFeed';
import type { Store, Product } from '@/data/commerce';
import { StoreCard } from '@/ui/components/StoreCard';
import { ProductCard } from '@/ui/components/ProductCard';
import { Chip } from '@/ui/components/Chip';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { EmptyState } from '@/ui/components/EmptyState';

interface SearchSection {
  title: string;
  data: (Store | Product)[];
  type: 'store' | 'product';
}

export default function SearchScreen() {
  const { colors, spacing, typography } = useTheme();
  const { search, result, loading, error } = useSearch();
  const { data: feed } = useFeed();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      void search(query);
    }, 280);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const sections = useMemo<SectionListData<(Store | Product), SearchSection>[]>(() => {
    if (!result) return [];
    return [
      { title: 'Stores', data: result.stores, type: 'store' as const },
      { title: 'Products', data: result.products, type: 'product' as const },
    ].filter((section) => section.data.length > 0);
  }, [result]);

  const showEmptyState = !loading && query.length > 0 && sections.length === 0 && !error;

  return (
    <Screen padded scrollable={false}>
      <View style={{ gap: spacing.sm }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search stores, dishes, or categories"
          placeholderTextColor={colors.textMuted}
          style={{
            padding: spacing.sm,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.surface,
            fontSize: typography.body,
          }}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {feed ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.small }}>Quick filters</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {feed.quickCategories.map((category) => (
                <Chip key={category} label={category} />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {loading && (
        <View style={{ marginTop: spacing.lg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {error ? (
        <EmptyState title="Search failed" description={error.message} />
      ) : showEmptyState ? (
        <EmptyState title="No matches" description="Try a different ingredient or store name." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => ('id' in item ? item.id : String(item))}
          renderSectionHeader={({ section }) => (
            <Text style={{ marginTop: spacing.lg, color: colors.text, fontSize: typography.heading, fontWeight: '600' }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item, section }) =>
            section.type === 'store' ? <StoreCard store={item as Store} /> : <ProductCard product={item as Product} />
          }
          SectionSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
        />
      )}
    </Screen>
  );
}
