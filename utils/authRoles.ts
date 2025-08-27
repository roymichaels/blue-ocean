import tonAuth from '../services/tonAuth';
import SettingsAgent from '../agents/settings-agent';
import ordersAgent from '../agents/orders-agent';

export async function isPlatformAdmin(): Promise<boolean> {
  const address = tonAuth.getAddress();
  if (!address) return false;
  const admins = await SettingsAgent.getInstance().getAdmins();
  return admins.includes(address);
}

export async function isStoreOwner(storeId: string): Promise<boolean> {
  const address = tonAuth.getAddress();
  if (!address) return false;
  if (address === storeId) return true;
  if (await isPlatformAdmin()) {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('asStoreId') === storeId;
    }
  }
  return false;
}

export async function canAccessOrder(orderId: string): Promise<boolean> {
  const address = tonAuth.getAddress();
  if (!address) return false;
  const order = await ordersAgent.get(orderId);
  if (!order) return false;
  if (
    order.buyerAddress === address ||
    order.sellerAddress === address ||
    order.driverAddress === address
  ) {
    return true;
  }
  if (await isPlatformAdmin()) return true;
  if (typeof sessionStorage !== 'undefined') {
    const asStoreId = sessionStorage.getItem('asStoreId');
    if (asStoreId && (order.sellerAddress === asStoreId || order.items?.[0]?.product?.storeId === asStoreId)) {
      return true;
    }
  }
  return false;
}

export default {
  isPlatformAdmin,
  isStoreOwner,
  canAccessOrder,
};
