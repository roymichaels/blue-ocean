import React from 'react';
import { View, ScrollView } from 'react-native';
import Text from '@/ui/primitives/Text';
import { useAppRouter, useLanding } from '@/services';
import AppShell from '../components/layout/AppShell';
import Divider from '@/ui/primitives/Divider';
import { ProductCard } from '@/features/products';
import { useTheme } from '@/ui/ThemeProvider';
import SmartImage from '../components/SmartImage';
import Button from '@/ui/primitives/Button';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { spacing, radius } from '@/shared/ui/tokens';
import { routes } from '@/utils/routes';
import { t } from '@/services/i18n';

export default function Landing() {
  const { push } = useAppRouter();
  const { colors } = useTheme();
  const { data } = useLanding();
  const featured = data?.featured ?? [];
  const banners = data?.banners ?? [];
  const categories = data?.categories ?? [];

  return (
    <ErrorBoundary>
      <AppShell>
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
              <View style={{ flexDirection: 'row', gap: spacing.spacer12, paddingHorizontal: spacing.spacer16 }}>
                {banners.map((b) => (
                  <View
                    key={b.id}
                    style={{
                      width: 280,
                      height: 140,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.border.primary,
                      backgroundColor: colors.surface.primary,
                    }}
                  >
                    {b.image ? (
                      <SmartImage uri={b.image} width={280} height={140} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.gold, fontWeight: '800' }}>{b.title}</Text>
                        {b.subtitle ? (
                          <Text style={{ color: colors.text.secondary, marginTop: 4 }}>{b.subtitle}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
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
              <View style={{ flexDirection: 'row', gap: spacing.spacer8 }}>
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    title={c.name}
                    onPress={() => push(routes.category(c.id))}
                    style={{
                      paddingHorizontal: spacing.spacer12,
                      paddingVertical: spacing.spacer8,
                      borderRadius: radius.xl,
                      borderWidth: 1,
                      borderColor: colors.border.primary,
                      backgroundColor: colors.surface.primary,
                    }}
                    textStyle={{ color: colors.text.primary, fontWeight: '600' }}
                  />
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
    </ErrorBoundary>
  );
}
