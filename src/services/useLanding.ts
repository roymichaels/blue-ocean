import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, HeroBanner, Category } from '@/types';

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
  { id: 'b1', image: '', title: 'Welcome to Blue Ocean', subtitle: 'Own your store on NEAR' },
  { id: 'b2', image: '', title: 'Decentralized by design', subtitle: 'Fast, P2P and secure' },
];

const defaultCategories: Category[] = [
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home', name: 'Home' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'sports', name: 'Sports' },
  { id: 'books', name: 'Books' },
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
