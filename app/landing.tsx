import React, { useCallback, useMemo } from 'react';
import { Text, Divider, Button, Container, Stack, ScrollArea, Grid } from '@/ui';
import { useAppRouter, useLanding } from '@/services';
import AppShell from '@/components/layout/AppShell';
import { ProductCard } from '@/features/products';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import SmartImage from '../components/SmartImage';
import { spacing, radius, typography } from '@/shared/ui/tokens';
import { routes } from '@/utils/routes';
import { HeroBanner, Category } from '@/types';
import { Link } from 'expo-router';

export const BannerItem = React.memo(
  ({ banner, colors }: { banner: HeroBanner; colors: any }) => {
    const containerStyle = useMemo(
      () => ({
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary,
        borderWidth: spacing.spacer4 / spacing.spacer4,
        width: spacing.spacer40 * 7,
        height: spacing.spacer40 * 3 + spacing.spacer20,
      }),
      [colors]
    );

    return (
      <Container style={containerStyle}>
        {banner.image ? (
          <SmartImage
            uri={banner.image}
            width={spacing.spacer40 * 7}
            height={spacing.spacer40 * 3 + spacing.spacer20}
            contentFit="cover"
          />
        ) : (
          <Stack style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.gold, fontWeight: '800' }}>{banner.title}</Text>
            {banner.subtitle ? (
              <Text style={{ color: colors.text.secondary, marginTop: spacing.spacer4 }}>
                {banner.subtitle}
              </Text>
            ) : null}
          </Stack>
        )}
      </Container>
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
        borderWidth: spacing.spacer4 / spacing.spacer4,
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
  const { t } = useLanguage();
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

  return (
    <AppShell showSearch={false}>
      <ScrollArea backgroundColor={colors.canvas} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Container
          style={{
            paddingHorizontal: spacing.spacer16,
            paddingTop: spacing.spacer24,
            paddingBottom: spacing.spacer12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography['2xl'].fontSize,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            {t('landing.title')}
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: spacing.spacer8, textAlign: 'center' }}>
            {t('landing.subtitle')}
          </Text>
          <Divider
            style={{
              width: spacing.spacer40 * 5,
              backgroundColor: colors.gold,
              borderRadius: spacing.spacer4 / spacing.spacer4,
              marginVertical: 0,
              marginTop: spacing.spacer12,
            }}
          />
          <Stack direction="horizontal" gap="spacer12" style={{ marginTop: spacing.spacer16 }}>
            <Link href={routes.store('alpha')} asChild>
              <Button title={t('landing.openAlphaStore')} />
            </Link>
            <Link href="/" asChild>
              <Button
                title={t('landing.browseApp')}
                style={{ borderRadius: radius.md, borderColor: colors.gold, backgroundColor: 'transparent' }}
              />
            </Link>
          </Stack>
        </Container>

        {/* Banners */}
        <Container style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: typography.lg.fontSize,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {t('landing.highlights')}
          </Text>
          <Divider
            style={{
              width: spacing.spacer40 * 4,
              backgroundColor: colors.gold,
              borderRadius: spacing.spacer4 / spacing.spacer4,
              alignSelf: 'center',
              marginVertical: 0,
              marginTop: spacing.spacer8,
            }}
          />
          <Container style={{ marginTop: spacing.spacer12 }}>
            <ScrollArea horizontal showsHorizontalScrollIndicator={false}>
              <Stack direction="horizontal" gap="spacer12" style={{ paddingHorizontal: spacing.spacer16 }}>
                {banners.map((b: HeroBanner) => (
                  <BannerItem key={b.id} banner={b} colors={colors} />
                ))}
              </Stack>
            </ScrollArea>
          </Container>
        </Container>

        {/* Categories */}
        <Container style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.lg.fontSize, fontWeight: '700' }}>
            {t('landing.categories')}
          </Text>
          <Divider
            style={{
              width: spacing.spacer40 * 3,
              backgroundColor: colors.gold,
              borderRadius: spacing.spacer4 / spacing.spacer4,
              alignSelf: 'flex-start',
              marginVertical: 0,
              marginTop: spacing.spacer8,
            }}
          />
          <Container style={{ marginTop: spacing.spacer12 }}>
            <ScrollArea horizontal showsHorizontalScrollIndicator={false}>
              <Stack direction="horizontal" gap="spacer8">
                {categories.map((c: Category) => (
                  <CategoryButton key={c.id} category={c} colors={colors} onPress={handleCategoryPress} />
                ))}
              </Stack>
            </ScrollArea>
          </Container>
        </Container>

        {/* Featured */}
        <Container style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.lg.fontSize, fontWeight: '700' }}>
            {t('landing.featured')}
          </Text>
          <Divider
            style={{
              width: spacing.spacer40 * 3,
              backgroundColor: colors.gold,
              borderRadius: spacing.spacer4 / spacing.spacer4,
              alignSelf: 'flex-start',
              marginVertical: 0,
              marginTop: spacing.spacer8,
            }}
          />
          <Container style={{ marginTop: spacing.spacer12 }}>
            <Grid gap="spacer12">
              {featured.map((p) => (
                <Container key={p.id} style={{ width: '48%' }}>
                  <ProductCard key={p.id} product={p} />
                </Container>
              ))}
            </Grid>
            {featured.length === 0 && (
              <Text style={{ color: colors.text.secondary }}>
                {t('landing.noFeaturedItemsYet')}
              </Text>
            )}
          </Container>
        </Container>
      </ScrollArea>
    </AppShell>
  );
}
