export type TabDef = {
  name: string; // file-based route under (tabs)
  title: string; // display title
  icon: string; // lucide icon name mapping
};
export const baseTabs: TabDef[] = [
  { name: 'index', title: 'Home', icon: 'Home' },
  { name: 'stores', title: 'Stores', icon: 'Store' },
  { name: 'cart', title: 'Cart', icon: 'ShoppingCart' },
  { name: 'orders', title: 'Orders', icon: 'Package' },
  { name: 'profile', title: 'Profile', icon: 'User' },
];

export const consumerTabs: TabDef[] = [...baseTabs];
export const ownerTabs: TabDef[] = [...baseTabs];
export const adminTabs: TabDef[] = [...baseTabs];

export function getTabsForAuth(auth: { isAdmin?: boolean; isStoreOwner?: boolean }) {
  if (auth?.isAdmin) return adminTabs;
  if (auth?.isStoreOwner) return ownerTabs;
  return consumerTabs;
}

