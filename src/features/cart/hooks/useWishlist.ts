import { useCallback, useEffect, useState } from 'react';
import CartService from '../services/cart';
import { WishlistItem } from '@/types';

export default function useWishlist(visible: boolean) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const loadWishlistItems = useCallback(() => {
    const cartService = CartService.getInstance();
    setWishlistItems(cartService.getWishlistItems());
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cartService = CartService.getInstance();
    const handleUpdate = () => setWishlistItems(cartService.getWishlistItems());
    handleUpdate();
    cartService.addListener(handleUpdate);
    return () => cartService.removeListener(handleUpdate);
  }, [visible]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    await CartService.getInstance().removeFromWishlist(productId);
  }, []);

  const addToCart = useCallback(async (item: WishlistItem) => {
    await CartService.getInstance().addToCart(item.productId, undefined, 1);
  }, []);

  return {
    wishlistItems,
    loadWishlistItems,
    removeFromWishlist,
    addToCart,
  };
}
