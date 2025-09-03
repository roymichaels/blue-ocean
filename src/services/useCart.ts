import { useQuery } from '@tanstack/react-query';
import CartService from '@/features/cart/services/cart';
import { CartItem } from '@/types';

export function useCart() {
  return useQuery<CartItem[]>({
    queryKey: ['cart'],
    queryFn: async () => {
      const svc = CartService.getInstance();
      return svc.getCartItems();
    },
    select: (data) => data ?? [],
  });
}
