import React from 'react';
import { ScrollView, StyleSheet, Pressable } from 'react-native';
import AppShell from '../components/layout/AppShell';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import EmptyState from '@/shared/ui/EmptyState';
import { Plus } from 'lucide-react-native';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { useCategories } from '@/services';
import Text from '@/ui/primitives/Text';
import { spacing } from '@/ui/tokens';
import { routes } from '@/utils/routes';

export default function Categories() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const { data: categories = [] } = useCategories();

  return (
    <ErrorBoundary>
      <AppShell>
        {categories.length > 0 ? (
          <ScrollView style={{ backgroundColor: colors.canvas }} contentContainerStyle={styles.list}>
            {categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => push(routes.category(c.id))}
                  style={[styles.item, { borderColor: colors.border.primary }]}
                >
                <Text style={[styles.itemText, { color: colors.text.primary }]}>{c.name}</Text>
              </Pressable>
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
    padding: spacing.spacer16,
  },
  item: {
    paddingVertical: spacing.spacer12,
    borderBottomWidth: 1,
  },
  itemText: {
    fontWeight: '600',
  },
});

