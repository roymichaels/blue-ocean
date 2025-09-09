import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Container, Stack, ScrollArea } from '@/ui/layout';
import CategoryCard from '@/features/home/components/CategoryCard';
import EmptyState from '@/shared/ui/EmptyState';
import { Category } from '@/types';
import { styles } from './HomeCategories.styles';

type Props = {
  categories: Category[];
  isStoreOwner: boolean;
  onSelectCategory: (id: string) => void;
  onViewAll: () => void;
};

export default function HomeCategories({
  categories,
  isStoreOwner,
  onSelectCategory,
  onViewAll,
}: Props) {
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();

  return (
    <Container style={styles.section}>
      <Stack direction="horizontal" style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
          {t('home.categories')}
        </Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.seeAll, { color: themeColors.gold }]}>
            {t('common.viewAll')}
          </Text>
        </TouchableOpacity>
      </Stack>

      {categories.length > 0 ? (
        <ScrollArea
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {categories.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.categoryWrapper}>
              <CategoryCard
                category={item}
                isStoreOwner={isStoreOwner}
                onPress={() => onSelectCategory(item.id)}
                onEdit={() => onSelectCategory(item.id)}
              />
            </View>
          ))}
        </ScrollArea>
      ) : (
        <EmptyState
          icon={Plus}
          title={t('home.noCategories')}
          message={t('home.categoriesComingSoon')}
        />
      )}
    </Container>
  );
}
