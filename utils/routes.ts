export const routes = {
  category: (id: string | number) => `/category/${id}`,
  subcategory: (id: string | number) => `/subcategory/${id}`,
  product: (id: string | number) => `/product/${id}`,
  store: (id: string | number) => `/store/${id}`,
  storeAdminDashboard: (storeId: string | number, impersonate = false) =>
    `/store/${storeId}/admin/dashboard${impersonate ? '?impersonate=true' : ''}`,
  storeAdminProducts: (storeId: string | number) => `/store/${storeId}/admin/products`,
  storeAdminOrders: (storeId: string | number) => `/store/${storeId}/admin/orders`,
  storeAdminDeliveries: (storeId: string | number) => `/store/${storeId}/admin/deliveries`,
  storeAdminPricingTiers: (storeId: string | number) => `/store/${storeId}/admin/pricing-tiers`,
};

export type Routes = typeof routes;
