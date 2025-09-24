import React, { useMemo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useStores } from '@/hooks/useStores';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Container, ScrollArea, Stack } from '@/ui/layout';
import { Spinner } from '@/ui/primitives';
import EmptyState from '@/shared/ui/EmptyState';
import { radius, spacing, typography } from '@/ui/tokens';

const MAX_FEATURED_STORES = 8;

export default function FeaturedStoresCarousel() {
  const { data: stores = [], isLoading } = useStores('default');
  const { push } = useAppRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();

  const featuredStores = useMemo(() => {
    const seen = new Map<string, typeof stores[number]>();
    for (const store of stores) {
      if (!store || !store.id) continue;
      if (!seen.has(store.id)) {
        seen.set(store.id, store);
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0))
      .slice(0, MAX_FEATURED_STORES);
  }, [stores]);

  const openStore = useCallback(
    (id: string) => {
      if (!id) return;
      push(`/store/${id}`);
    },
    [push],
  );

  const loading = isLoading && featuredStores.length === 0;

  if (loading) {
    return (
      <Container style={styles.section}>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Container>
    );
  }

  if (featuredStores.length === 0) {
    return (
      <Container style={styles.section}>
        <EmptyState
          icon={ShoppingBag}
          title={t('home.featuredStoresEmptyTitle', 'No featured stores yet')}
          message={t(
            'home.featuredStoresEmptyMessage',
            'Featured stores will appear here soon.',
          )}
        />
      </Container>
    );
  }

  return (
    <Container style={styles.section}>
      <Stack direction="horizontal" style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('home.featuredStores', 'Featured Stores')}
        </Text>
      </Stack>
      <ScrollArea
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {featuredStores.map((store) => (
          <TouchableOpacity
            key={store.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface.elevated,
                borderColor: colors.border.primary,
              },
            ]}
            onPress={() => openStore(store.id)}
            accessibilityRole="button"
            testID={`featured-store-${store.id}`}
          >
            <Stack gap="spacer8">
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: colors.surface.primary },
                ]}
              >
                <ShoppingBag size={20} color={colors.gold} />
              </View>
              <Text
                style={[styles.storeName, { color: colors.text.primary }]}
                numberOfLines={1}
              >
                {store.name || t('home.unnamedStore', 'Unnamed Store')}
              </Text>
              {store.owner ? (
                <Text
                  style={[styles.storeOwner, { color: colors.text.secondary }]}
                  numberOfLines={1}
                >
                  {store.owner}
                </Text>
              ) : null}
            </Stack>
          </TouchableOpacity>
        ))}
      </ScrollArea>
    </Container>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spacer12,
  },
  title: {
    ...typography.lg,
    fontWeight: '600',
  },
  carouselContent: {
    paddingRight: spacing.spacer16,
  },
  card: {
    width: 180,
    padding: spacing.spacer12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginRight: spacing.spacer12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    ...typography.md,
    fontWeight: '600',
  },
  storeOwner: {
    ...typography.xs,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

