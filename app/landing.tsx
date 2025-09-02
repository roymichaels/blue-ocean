import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import AppShell from '../components/layout/AppShell';
import Section from '../components/ui/Section';
import GoldDivider from '../components/ui/GoldDivider';
import DatabaseService from '../services/database';
import { Product, Category, HeroBanner } from '../types';
import ProductCard from '@/features/products/components/ProductCard';
import { useTheme } from '../contexts/ThemeContext';
import SmartImage from '../components/SmartImage';
import Button from '../components/ui/Button';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { spacing } from '@/shared/ui/tokens';

export default function Landing() {
  const { push } = useAppRouter();
  const { colors } = useTheme();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<HeroBanner[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const db = DatabaseService.getInstance();
        const prods = await db.getProducts();
        setFeatured(prods.slice(0, 6));
        try {
          const cats = await db.getCategories();
          setCategories(cats.slice(0, 8));
        } catch {}
        try {
          const hs = await db.getHeroBanners();
          setBanners(hs);
        } catch {}
      } catch {}
    };
    load();
  }, []);

  return (
    <ErrorBoundary>
      <AppShell>
        <ScrollView style={{ backgroundColor: colors.canvas }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
        <View style={{ paddingHorizontal: spacing.spacer16, paddingTop: spacing.spacer24, paddingBottom: spacing.spacer12, alignItems: 'center' }}>
          <Text style={{ color: colors.text.primary, fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            Blue Ocean Marketplace
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: spacing.spacer8, textAlign: 'center' }}>
            Decentralized commerce on NEAR — own your store, your data, your future.
          </Text>
          <View style={{ marginTop: spacing.spacer12 }}>
            <GoldDivider width={200} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.spacer12, marginTop: spacing.spacer16 }}>
            <Link href="/store/alpha" asChild>
              <Button title="Open Alpha Store" style={{ borderRadius: 10 }} />
            </Link>
            <Link href="/" asChild>
              <Button
                title="Browse App"
                variant="secondary"
                style={{ borderRadius: 10, borderColor: colors.gold, backgroundColor: 'transparent' }}
              />
            </Link>
          </View>
        </View>

        {/* Banners */}
        <Section title="Highlights" center>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.spacer12, paddingHorizontal: spacing.spacer16 }}>
              {(banners.length ? banners : [
                { id: 'b1', image: '', title: 'Welcome to Blue Ocean', subtitle: 'Own your store on NEAR' },
                { id: 'b2', image: '', title: 'Decentralized by design', subtitle: 'Fast, P2P and secure' },
              ] as any[]).map((b) => (
                <View key={b.id} style={{ width: 280, height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.surface.primary }}>
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
        </Section>

        {/* Categories */}
        <Section title="Categories">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.spacer8 }}>
              {(categories.length ? categories : [
                { id: 'electronics', name: 'Electronics' },
                { id: 'fashion', name: 'Fashion' },
                { id: 'home', name: 'Home' },
                { id: 'beauty', name: 'Beauty' },
                { id: 'sports', name: 'Sports' },
                { id: 'books', name: 'Books' },
              ] as any[]).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => push(`/category/${c.id}`)}
                  style={{
                    paddingHorizontal: spacing.spacer12,
                    paddingVertical: spacing.spacer8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.primary,
                  }}
                >
                  <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Section>

        {/* Featured */}
        <Section title="Featured">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.spacer12, paddingHorizontal: 0 }}>
            {featured.map((p) => (
              <View key={p.id} style={{ width: '48%' }}>
                <ProductCard product={p} />
              </View>
            ))}
          </View>
          {featured.length === 0 && (
            <Text style={{ color: colors.text.secondary }}>No featured items yet.</Text>
          )}
        </Section>
      </ScrollView>
      </AppShell>
    </ErrorBoundary>
  );
}
