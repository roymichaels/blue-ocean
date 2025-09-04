import { useEffect, useState } from 'react';
import { errorLog } from '@/utils/logger';
import OrderService from '@/services/orders';
import CartService from '@/features/cart/services/cart';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { User } from '@/types';

let listStores: (() => Promise<any[]>) | undefined;
if (chain === 'near') {
  ({ listStores } = require('@/features/stores/services/nearStores'));
}

export function useProfileData(user?: User | null) {
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const orderService = OrderService.getInstance();
        const cartService = CartService.getInstance();
        const db = DatabaseService.getInstance();
        const [count, reviews, wishlist] = await Promise.all([
          orderService.getUserOrderCount(user.id),
          db.getReviews(),
          Promise.resolve(cartService.getWishlistItemsCount()),
        ]);
        setOrdersCount(count);
        setWishlistCount(wishlist);
        setReviewCount(reviews.filter((r: any) => r.userId === user.id).length);
      } catch (err) {
        errorLog('Error loading profile data', err);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const loadStore = async () => {
      if (!user?.address || !listStores) return;
      try {
        const stores = await listStores();
        const store = stores.find((s: any) => s.owner === user.address);
        if (store) setStoreId(store.id);
      } catch (err) {
        errorLog('Failed to load store for user', err);
      }
    };
    loadStore();
  }, [user?.address]);

  return { ordersCount, wishlistCount, reviewCount, storeId };
}

export default useProfileData;
