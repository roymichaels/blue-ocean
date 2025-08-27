import OrderService from '../services/orders';
import { CartItem, ShippingAddress } from '../types';

const mockStore: Record<string, any> = {};
const mockProducts: Record<string, any> = {};

jest.mock('../services/tonOrders', () => ({
  setOrder: jest.fn(async (o: any) => { mockStore[o.id] = o; }),
  getOrder: jest.fn(async (id: string) => mockStore[id] || null),
  listOrders: jest.fn().mockResolvedValue([]),
  removeOrder: jest.fn(),
  listOrdersBySeller: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/eventBus', () => ({ publish: jest.fn() }));

jest.mock('../services/tonContract', () => ({
  deployOrderPayment: jest.fn(),
  releasePayment: jest.fn(),
  refundPayment: jest.fn(),
}));

jest.mock('../services/tonStores', () => ({
  getStore: jest.fn(async (id: string) => ({ id, name: id, owner: `seller_${id}`, nftId: id })),
}));

jest.mock('../services/tonProducts', () => ({
  getProduct: jest.fn(async (id: string) => mockProducts[id] || null),
  setProduct: jest.fn(async (p: any) => {
    mockProducts[p.id] = p;
  }),
}));

jest.mock('../services/eventLog', () => ({ logOrderEvent: jest.fn() }));

jest.mock('../agents/orders-agent', () => ({
  subscribe: jest.fn(),
  add: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn().mockResolvedValue([]),
  update: jest.fn(),
}));

jest.mock('../services/nearAuth', () => ({
  getAccountId: jest.fn().mockReturnValue('buyer_address'),
  signIn: jest.fn(),
}));

jest.mock('../constants/tenant', () => ({
  getFeeSettings: jest.fn().mockResolvedValue({ feeAddress: 'fee_addr', feeBps: 250 }),
}));

describe('card checkout fee deduction', () => {
  it('deducts platform fee for card payments', async () => {
    jest
      .spyOn<any, any>(OrderService.prototype as any, 'simulateOrderProgress')
      .mockImplementation(() => {});

    const svc = OrderService.getInstance();

    const items: CartItem[] = [
      {
        id: 'i1',
        productId: 'p1',
        product: {
          id: 'p1',
          name: 'P1',
          price: 100,
          description: 'd',
          category: 'c',
          images: [],
          rating: 0,
          reviews: 0,
          storeId: 's1',
          stock: 10,
        },
        quantity: 1,
        addedAt: '',
      },
    ];

    mockProducts['p1'] = { ...items[0].product };

    const shipping: ShippingAddress = {
      name: 'A',
      phone: '1',
      street: 'st',
      city: 'c',
      postalCode: 'p',
    };

    const orders = await svc.createOrdersFromCart('user1', items, shipping, 'card');
    expect(orders).toHaveLength(1);
    const order = orders[0];
    expect(order.total).toBe(100);
    expect(order.platformFee).toBeCloseTo(2.5);
    expect(order.sellerPayout).toBeCloseTo(97.5);
  });
});

afterAll(() => {
  jest.resetModules();
});
