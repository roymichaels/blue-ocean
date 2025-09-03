import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import AppShell from '../components/layout/AppShell';
import DatabaseService from '../services/database';
import { Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import useAppRouter from 'hooks/useAppRouter';
import EmptyState from '@/shared/ui/EmptyState';
import { Plus } from 'lucide-react-native';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function Categories() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const db = DatabaseService.getInstance();
        const data = await db.getCategories();
        setCategories(data);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  return (
    <ErrorBoundary>
      <AppShell>
        {categories.length > 0 ? (
          <ScrollView style={{ backgroundColor: colors.canvas }} contentContainerStyle={styles.list}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => push(`/category/${c.id}`)}
                style={[styles.item, { borderColor: colors.border.primary }]}
              >
                <Text style={[styles.itemText, { color: colors.text.primary }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={Plus}
            title={t('home.noCategories')}
            message={t('home.categoriesComingSoon')}
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemText: {
    fontWeight: '600',
  },
});

