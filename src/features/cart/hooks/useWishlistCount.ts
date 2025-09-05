import { useCallback, useEffect, useMemo, useState } from 'react';
import CartService from '../services/cart';

export default function useWishlistCount() {
  const [count, setCount] = useState(() =>
    CartService.getInstance().getWishlistItemsCount(),
  );

  const updateCount = useCallback(() => {
    const newCount = CartService.getInstance().getWishlistItemsCount();
    setCount((prev) => (prev === newCount ? prev : newCount));
  }, []);

  useEffect(() => {
    const cartService = CartService.getInstance();
    cartService.addListener(updateCount);
    updateCount();
    return () => {
      cartService.removeListener(updateCount);
    };
  }, [updateCount]);

  return useMemo(() => count, [count]);
}
