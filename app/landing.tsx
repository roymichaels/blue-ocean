import React, { useCallback, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Divider, Button } from '@/ui';
import { useAppRouter, useLanding } from '@/services';
import AppShell from '@/components/layout/AppShell';
import { ProductCard } from '@/features/products';
import { useTheme } from '@/ui/ThemeProvider';
import SmartImage from '../components/SmartImage';
import { spacing, radius } from '@/shared/ui/tokens';
import { routes } from '@/utils/routes';
import { t } from '@/i18n';
import { HeroBanner, Category } from '@/types';
import { Link } from 'expo-router';

export const BannerItem = React.memo(
  ({ banner, colors }: { banner: HeroBanner; colors: any }) => {
    const containerStyle = useMemo(
      () => ({
        width: 280,
        height: 140,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.primary,
        backgroundColor: colors.surface.primary,
      }),
      [colors]
    );

    return (
      <View style={containerStyle}>
        {banner.image ? (
          <SmartImage uri={banner.image} width={280} height={140} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.gold, fontWeight: '800' }}>{banner.title}</Text>
            {banner.subtitle ? (
              <Text style={{ color: colors.text.secondary, marginTop: 4 }}>
                {banner.subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    );
  }
);

export const CategoryButton = React.memo(
  ({
    category,
    onPress,
    colors,
  }: {
    category: Category;
    onPress: (id: string) => void;
    colors: any;
  }) => {
    const style = useMemo(
      () => ({
        paddingHorizontal: spacing.spacer12,
        paddingVertical: spacing.spacer8,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border.primary,
        backgroundColor: colors.surface.primary,
      }),
      [colors]
    );
    const textStyle = useMemo(
      () => ({ color: colors.text.primary, fontWeight: '600' }),
      [colors]
    );
    const handlePress = useCallback(() => onPress(category.id), [category.id, onPress]);

    return (
      <Button
        title={category.name}
        onPress={handlePress}
        style={style}
        textStyle={textStyle}
      />
    );
  }
);

export default function Landing() {
  const { push } = useAppRouter();
  const { colors } = useTheme();
  const { data } = useLanding();
  const featured = data?.featured ?? [];
  const banners = useMemo(() => data?.banners ?? [], [data?.banners]);
  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);

  const handleCategoryPress = useCallback(
    (id: string) => {
      push(routes.category(id));
    },
    [push]
  );

  const bannerRowStyle = useMemo(
    () => ({ flexDirection: 'row', gap: spacing.spacer12, paddingHorizontal: spacing.spacer16 }),
    []
  );
  const categoryRowStyle = useMemo(
    () => ({ flexDirection: 'row', gap: spacing.spacer8 }),
    []
  );

  return (
    <AppShell showSearch={false}>
        <ScrollView style={{ backgroundColor: colors.canvas }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
        <View style={{ paddingHorizontal: spacing.spacer16, paddingTop: spacing.spacer24, paddingBottom: spacing.spacer12, alignItems: 'center' }}>
          <Text style={{ color: colors.text.primary, fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            {t('landing.title')}
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: spacing.spacer8, textAlign: 'center' }}>
            {t('landing.subtitle')}
          </Text>
          <Divider
            style={{
              width: 200,
              height: 2,
              backgroundColor: colors.gold,
              borderRadius: 1,
              marginVertical: 0,
              marginTop: spacing.spacer12,
            }}
          />
          <View style={{ flexDirection: 'row', gap: spacing.spacer12, marginTop: spacing.spacer16 }}>
            <Link href={routes.store('alpha')} asChild>
              <Button title={t('landing.openAlphaStore')} />
            </Link>
            <Link href="/" asChild>
              <Button
                title={t('landing.browseApp')}
                style={{ borderRadius: radius.md, borderColor: colors.gold, backgroundColor: 'transparent' }}
              />
            </Link>
          </View>
        </View>

        {/* Banners */}
        <View style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 18,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {t('landing.highlights')}
          </Text>
          <Divider
            style={{
              width: 160,
              height: 2,
              backgroundColor: colors.gold,
              borderRadius: 1,
              alignSelf: 'center',
              marginVertical: 0,
              marginTop: spacing.spacer8,
            }}
          />
          <View style={{ marginTop: spacing.spacer12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={bannerRowStyle}>
                {banners.map((b: HeroBanner) => (
                  <BannerItem key={b.id} banner={b} colors={colors} />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Categories */}
        <View style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
          <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '700' }}>{t('landing.categories')}</Text>
          <Divider
            style={{
              width: 120,
              height: 2,
              backgroundColor: colors.gold,
              borderRadius: 1,
              alignSelf: 'flex-start',
              marginVertical: 0,
              marginTop: spacing.spacer8,
            }}
          />
          <View style={{ marginTop: spacing.spacer12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={categoryRowStyle}>
                {categories.map((c: Category) => (
                  <CategoryButton key={c.id} category={c} colors={colors} onPress={handleCategoryPress} />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Featured */}
        <View style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
          <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '700' }}>{t('landing.featured')}</Text>
          <Divider
            style={{
              width: 120,
              height: 2,
              backgroundColor: colors.gold,
              borderRadius: 1,
              alignSelf: 'flex-start',
              marginVertical: 0,
              marginTop: spacing.spacer8,
            }}
          />
          <View style={{ marginTop: spacing.spacer12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.spacer12, paddingHorizontal: 0 }}>
              {featured.map((p) => (
                <View key={p.id} style={{ width: '48%' }}>
                  <ProductCard key={p.id} product={p} />
                </View>
              ))}
            </View>
            {featured.length === 0 && (
              <Text style={{ color: colors.text.secondary }}>{t('landing.noFeaturedItemsYet')}</Text>
            )}
          </View>
        </View>
      </ScrollView>
      </AppShell>
  );
}
