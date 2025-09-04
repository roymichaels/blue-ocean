import { useState, useEffect, useCallback, useMemo } from 'react';
import CartService from '@/features/cart/services/cart';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Product } from '@/types';

export function useProductCard(product: Product) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { currencySymbol } = useCurrency();

  useEffect(() => {
    const cartService = CartService.getInstance();
    setIsInWishlist(cartService.isInWishlist(product.id));

    const handleUpdate = () => {
      setIsInWishlist(cartService.isInWishlist(product.id));
    };

    cartService.addListener(handleUpdate);
    return () => cartService.removeListener(handleUpdate);
  }, [product.id]);

  const toggleWishlist = useCallback(async () => {
    const cartService = CartService.getInstance();
    if (isInWishlist) {
      await cartService.removeFromWishlist(product.id);
    } else {
      await cartService.addToWishlist(product);
    }
  }, [isInWishlist, product]);

  const price = useMemo(
    () => `${currencySymbol}${product.price.toFixed(2)}`,
    [currencySymbol, product.price]
  );

  const originalPrice = useMemo(() => {
    if (product.originalPrice != null) {
      return `${currencySymbol}${product.originalPrice.toFixed(2)}`;
    }
    return undefined;
  }, [currencySymbol, product.originalPrice]);

  return { isInWishlist, toggleWishlist, price, originalPrice };
}

export default useProductCard;
