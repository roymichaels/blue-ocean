import { useQuery } from '@tanstack/react-query';
import ordersAgent from '@/agents/orders-agent';
import { Order } from '@/types';

export function useOrders(tenantId: string | null) {
  return useQuery({
    queryKey: ['orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as Order[];
      const all = await ordersAgent.getAll();
      return all.filter((o) => o.items?.[0]?.product?.storeId === tenantId);
    },
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!tenantId,
  });
}
