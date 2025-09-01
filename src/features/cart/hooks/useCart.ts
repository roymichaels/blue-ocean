import { useCallback, useEffect, useState } from 'react';
import CartService from '../services/cart';
import { CartItem } from '@/types';

export default function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const loadCartItems = useCallback(() => {
    const cartService = CartService.getInstance();
    setCartItems(cartService.getCartItems());
  }, []);

  useEffect(() => {
    const cartService = CartService.getInstance();
    const handleUpdate = () => setCartItems(cartService.getCartItems());
    handleUpdate();
    cartService.addListener(handleUpdate);
    return () => cartService.removeListener(handleUpdate);
  }, []);

  const updateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    await CartService.getInstance().updateCartItemQuantity(itemId, newQuantity);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    await CartService.getInstance().removeFromCart(itemId);
  }, []);

  const clearCart = useCallback(async () => {
    await CartService.getInstance().clearCart();
  }, []);

  const getTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const price = item.unitPrice ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  return {
    cartItems,
    loadCartItems,
    updateQuantity,
    removeItem,
    clearCart,
    getTotal,
    getTotalItems,
  };
}
