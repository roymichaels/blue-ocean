import { Order, ShippingAddress } from '@/types';
import { decryptShippingInfo } from '@/utils/shippingCrypto';

export async function decryptOrderShipping(
  order: Order,
): Promise<ShippingAddress | null> {
  if (!order.shipAddrEnc) return null;
  return decryptShippingInfo(order.shipAddrEnc);
}
