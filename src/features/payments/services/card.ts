import { getFeeSettings } from '@/constants/tenant';

export interface CardFees {
  platformFee: number;
  sellerPayout: number;
}

export async function calculateCardFees(total: number): Promise<CardFees> {
  const { feeBps } = await getFeeSettings();
  const fee = Number(((total * feeBps) / 10000).toFixed(2));
  const payout = Number((total - fee).toFixed(2));
  return { platformFee: fee, sellerPayout: payout };
}
