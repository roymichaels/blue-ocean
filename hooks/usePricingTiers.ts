import { useState, useEffect } from 'react';
import { errorLog } from '@/utils/logger';
import DatabaseService from '@/services/database';
import { PricingTier } from '@/types';

export function usePricingTiers() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    const loadPricingTiers = async () => {
      try {
        const db = DatabaseService.getInstance();
        const tiersData = await db.getPricingTiers();
        setPricingTiers(tiersData);
      } catch (error) {
        errorLog('Error loading pricing tiers:', error);
      }
    };
    loadPricingTiers();
  }, []);

  return pricingTiers;
}

export default usePricingTiers;
