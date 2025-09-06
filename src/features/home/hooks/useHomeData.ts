import { useMemo } from 'react';
import { Category, HeroBanner } from '@/types';
import { useLanguage } from '@/ui/ThemeProvider';

export function useHomeData() {
  const { t } = useLanguage();

  const fallbackCategories = useMemo(
    () => [
      { id: 'electronics', name: t('categories.electronics'), icon: String.fromCodePoint(0x1F4F1) } as Category,
      { id: 'fashion', name: t('categories.fashion'), icon: String.fromCodePoint(0x1F457) } as Category,
      { id: 'home', name: t('categories.home'), icon: String.fromCodePoint(0x1F3E0) } as Category,
      { id: 'beauty', name: t('categories.beauty'), icon: String.fromCodePoint(0x1F484) } as Category,
      { id: 'sports', name: t('categories.sports'), icon: String.fromCodePoint(0x1F3C0) } as Category,
      { id: 'books', name: t('categories.books'), icon: String.fromCodePoint(0x1F4DA) } as Category,
    ],
    [t]
  );

  const fallbackBanners = useMemo(
    () => [
      {
        id: 'b1',
        image: '',
        title: t('home.fallbackBanner1Title'),
        subtitle: t('home.fallbackBanner1Subtitle'),
      },
      {
        id: 'b2',
        image: '',
        title: t('home.fallbackBanner2Title'),
        subtitle: t('home.fallbackBanner2Subtitle'),
      },
    ],
    [t]
  );

  return { fallbackCategories, fallbackBanners } as const;
}

export type UseHomeDataReturn = ReturnType<typeof useHomeData>;
