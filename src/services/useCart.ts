import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CartService from '@/features/cart/services/cart';
import { CartItem, Product } from '@/types';

export function useCart() {
  return useQuery<CartItem[]>({
    queryKey: ['cart'],
    queryFn: async () => {
      const svc = CartService.getInstance();
      return svc.getCartItems();
    },
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const svc = CartService.getInstance();

  const add = useMutation({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) =>
      svc.addToCart(product, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => svc.removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateQty = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      svc.updateCartItemQuantity(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clear = useMutation({
    mutationFn: () => svc.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    addToCart: add.mutateAsync,
    removeFromCart: remove.mutateAsync,
    updateCartItemQuantity: updateQty.mutateAsync,
    clearCart: clear.mutateAsync,
    isPending: add.isPending || remove.isPending || updateQty.isPending || clear.isPending,
  };
}
