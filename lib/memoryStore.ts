export interface MemoryStore {
  config: Map<string, string>;
  users: Map<string, any>;
  userProfiles: Map<string, any>;
  products: Map<string, any>;
  orders: Map<string, any>;
  notifications: Map<string, any[]>;
}

export const store: MemoryStore = {
  config: new Map(),
  users: new Map(),
  userProfiles: new Map(),
  products: new Map(),
  orders: new Map(),
  notifications: new Map(),
};

export function resetStore() {
  store.config.clear();
  store.users.clear();
  store.userProfiles.clear();
  store.products.clear();
  store.orders.clear();
  store.notifications.clear();
}
