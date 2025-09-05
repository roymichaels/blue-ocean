import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AppShell from '../components/layout/AppShell';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/providers';
import { useAppRouter } from '@/services';
import EmptyState from '@/shared/ui/EmptyState';
import { Plus } from 'lucide-react-native';
import { useCategories } from '@/services';
import Button from '@/ui/primitives/Button';
import { spacing } from '@/ui/tokens';
import { routes } from '@/utils/routes';

export default function Categories() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const { data: categories = [] } = useCategories();

  return (
    <AppShell>
        {categories.length > 0 ? (
          <ScrollView style={{ backgroundColor: colors.canvas }} contentContainerStyle={styles.list}>
            {categories.map((c) => (
                <Button
                  key={c.id}
                  title={c.name}
                  onPress={() => push(routes.category(c.id))}
                  style={[
                    styles.item,
                    {
                      borderColor: colors.border.primary,
                      backgroundColor: 'transparent',
                    },
                  ]}
                  textStyle={[styles.itemText, { color: colors.text.primary }]}
                />
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
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.spacer16,
  },
  item: {
    paddingVertical: spacing.spacer12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  itemText: {
    fontWeight: '600',
  },
});

