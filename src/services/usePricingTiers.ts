import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { PricingTier } from '@/types';

export function usePricingTiers() {
  return useQuery({
    queryKey: ['pricing-tiers'],
    queryFn: async (): Promise<PricingTier[]> => {
      const db = DatabaseService.getInstance();
      return db.getPricingTiers();
    },
    select: (data) => data ?? [],
  });
}
