import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
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

export default function Landing() {
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.text.primary, fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            Blue Ocean Marketplace
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: 8, textAlign: 'center' }}>
            Decentralized commerce on NEAR — own your store, your data, your future.
          </Text>
          <View style={{ marginTop: 12 }}>
            <GoldDivider width={200} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Link href="/store/alpha" asChild>
              <Button title="Open Alpha Store" style={{ borderRadius: 10 }} />
            </Link>
            <Link href="/(tabs)" asChild>
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
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
              {(banners.length ? banners : [
                { id: 'b1', image: '', title: 'Welcome to Blue Ocean', subtitle: 'Own your store on NEAR' },
                { id: 'b2', image: '', title: 'Decentralized by design', subtitle: 'Fast, P2P and secure' },
              ] as any[]).map((b) => (
                <View key={b.id} style={{ width: 280, height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.surface.primary }}>
                  {b.image ? (
                    <SmartImage uri={b.image} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="disk" />
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
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
                  onPress={() => router.push(`/category/${c.id}`)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 0 }}>
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
