import { useMemo } from 'react';
import { Product, PricingTier } from '@/types';
import { usePricingTiers } from '@/hooks/usePricingTiers';

export function useProductPricing(product: Product | null, quantity: number) {
  const { data: pricingTiers = [] } = usePricingTiers();

  const currentPricingTier: PricingTier | null = useMemo(() => {
    if (!product?.pricingTier) return null;
    return (
      pricingTiers.find(t => t.id === product.pricingTier) || null
    );
  }, [product?.pricingTier, pricingTiers]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const basePrice = product.price;
    const tier = currentPricingTier;
    if (!tier) return basePrice;

    if (tier.rules && tier.rules.length > 0) {
      const matched =
        tier.rules.find(r => quantity >= r.minQty && quantity <= r.maxQty) ||
        tier.rules
          .filter(r => quantity >= r.minQty)
          .sort((a, b) => b.minQty - a.minQty)[0];

      if (matched) {
        if (typeof matched.pricePerBaseUnit === 'number') {
          return matched.pricePerBaseUnit;
        }
        if (typeof matched.discountPct === 'number') {
          return basePrice * (1 - matched.discountPct / 100);
        }
      }
    }

    if (
      quantity >= tier.minQuantity &&
      typeof tier.pricePerUnit === 'number'
    ) {
      return tier.pricePerUnit;
    }

    return basePrice;
  }, [product, currentPricingTier, quantity]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    return effectivePrice * quantity;
  }, [product, effectivePrice, quantity]);

  const showTieredPricing = !!product && effectivePrice !== product.price;

  return { effectivePrice, totalPrice, currentPricingTier, showTieredPricing };
}

export default useProductPricing;
