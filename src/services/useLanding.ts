import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, HeroBanner, Category } from '@/types';
import { t } from '@/services/i18n';

interface LandingData {
  featured: Product[];
  banners: HeroBanner[];
  categories: Category[];
}

let listCategories: (() => Promise<Category[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@/features/products/services/nearCategories'));
}

const defaultBanners: HeroBanner[] = [
  {
    id: 'b1',
    image: '',
    title: t('landing.defaultBanners.welcome'),
    subtitle: t('landing.defaultBanners.ownStore'),
  },
  {
    id: 'b2',
    image: '',
    title: t('landing.defaultBanners.decentralized'),
    subtitle: t('landing.defaultBanners.fastSecure'),
  },
];

const defaultCategories: Category[] = [
  { id: 'electronics', name: t('landing.defaultCategories.electronics') },
  { id: 'fashion', name: t('landing.defaultCategories.fashion') },
  { id: 'home', name: t('landing.defaultCategories.home') },
  { id: 'beauty', name: t('landing.defaultCategories.beauty') },
  { id: 'sports', name: t('landing.defaultCategories.sports') },
  { id: 'books', name: t('landing.defaultCategories.books') },
];

export function useLanding() {
  return useQuery<LandingData>({
    queryKey: ['landing'],
    queryFn: async () => {
      const db = DatabaseService.getInstance();

      const [products, bannersRaw, categoriesRaw] = await Promise.all([
        db.getProducts(),
        db.getHeroBanners().catch(() => [] as HeroBanner[]),
        listCategories ? listCategories().catch(() => [] as Category[]) : Promise.resolve([]),
      ]);

      const featured = products.slice(0, 6);
      const banners = bannersRaw.length ? bannersRaw : defaultBanners;
      const categories = (categoriesRaw.length ? categoriesRaw : defaultCategories).slice(0, 8);

      return { featured, banners, categories };
    },
    initialData: { featured: [], banners: defaultBanners, categories: defaultCategories },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
