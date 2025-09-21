import { setProduct, listProducts } from '@/features/products/services/nearProducts';
import { setOrder, listOrders } from '@/services/nearOrders';
import {
  setStore,
  listStores,
  createDefaultStoreServiceDeps,
} from '@/features/stores/services/nearStores';
import { Product, Order, Store, ShippingAddress } from '../types';

jest.mock('@/services/nearKvStore', () => {
  const store = new Map<string, string>();
  return {
    setValue: async (_addr: string, key: string, value: string) => {
      if (value) store.set(key, value); else store.delete(key);
    },
    getValue: async (_addr: string, key: string) => store.get(key) || null,
    listValues: async (_addr: string) => Array.from(store.entries()).map(([key, value]) => ({ key, value })),
    removeValue: async (_addr: string, key: string) => { store.delete(key); },
  };
});

const baseStoreServiceDeps = createDefaultStoreServiceDeps();
const mockStoreChainClient = {
  mintStore: jest.fn(),
  submitMutation: jest.fn().mockResolvedValue(undefined),
  createStoreOnChain: jest.fn(),
};
const storeServiceDeps = {
  ...baseStoreServiceDeps,
  storeChainClient: mockStoreChainClient,
};

beforeEach(() => {
  mockStoreChainClient.submitMutation.mockClear();
});

describe('store data isolation', () => {
  it('separates products by storeId', async () => {
    const base: Omit<Product, 'id'> = { name: '', price: 1, description: '', category: '', images: [], rating: 0, reviews: 0, stock: 1, storeId: '' };
    await setProduct('s1', { ...base, id: 'p1', storeId: 's1' });
    await setProduct('s2', { ...base, id: 'p2', storeId: 's2' });
    const s1 = await listProducts('s1');
    const s2 = await listProducts('s2');
    expect(s1.map(p => p.id)).toEqual(['p1']);
    expect(s2.map(p => p.id)).toEqual(['p2']);
  });

  it('separates orders by storeId', async () => {
    const addr: ShippingAddress = { name: 'n', phone: 'p', street: 's', city: 'c', postalCode: 'z' };
    const o1: Order = { id: 'o1', userId: 'u', items: [], total: 0, status: 'order_received', shippingAddress: addr, itemsHash: '', paymentMethod: 'near', buyerAddress: '', sellerAddress: '', createdAt: '', updatedAt: '', trackingSteps: [] } as Order;
    const o2: Order = { ...o1, id: 'o2' };
    await setOrder('s1', o1);
    await setOrder('s2', o2);
    const l1 = await listOrders('s1');
    const l2 = await listOrders('s2');
    expect(l1.map(o => o.id)).toEqual(['o1']);
    expect(l2.map(o => o.id)).toEqual(['o2']);
  });

  it('separates stores by storeId', async () => {
    const s1: Store = { id: 'a', name: 'A', owner: '', nftId: '' };
    const s2: Store = { id: 'b', name: 'B', owner: '', nftId: '' };
    await setStore('s1', s1, storeServiceDeps);
    await setStore('s2', s2, storeServiceDeps);
    expect(mockStoreChainClient.submitMutation).toHaveBeenCalledTimes(2);
    expect(mockStoreChainClient.submitMutation).toHaveBeenCalledWith('add', { store: s1 });
    expect(mockStoreChainClient.submitMutation).toHaveBeenCalledWith('add', { store: s2 });
    const l1 = await listStores('s1', storeServiceDeps).read();
    const l2 = await listStores('s2', storeServiceDeps).read();
    expect(l1.map(s => s.id)).toEqual(['a']);
    expect(l2.map(s => s.id)).toEqual(['b']);
  });
});
