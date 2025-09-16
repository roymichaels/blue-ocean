import { Buffer } from 'buffer';
import { getPublicKey, sign } from '@noble/ed25519';
import { utils as nearUtils } from 'near-api-js';
import OrderService from '@/services/orders';
import { CartItem, ShippingAddress } from '../types';
import { requestScopes } from '@/services/session';

const walletSecretKey = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
let walletPublicKeyStr = 'ed25519:';

const mockStore: Record<string, any> = {};
const mockProducts: Record<string, any> = {};

jest.mock('@/services/chain', () => ({
  chainAdapter: {
    getAccountId: jest.fn(() => 'buyer.near'),
    openModal: jest.fn(),
    getPublicKey: jest.fn(() => walletPublicKeyStr),
    signMessage: jest.fn(),
  },
}));

jest.mock('@/services/nearOrders', () => ({
  setOrder: jest.fn(async (o: any) => { mockStore[o.id] = o; }),
  getOrder: jest.fn(async (id: string) => mockStore[id] || null),
  listOrders: jest.fn().mockResolvedValue([]),
  removeOrder: jest.fn(),
  listOrdersBySeller: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/services/eventBus', () => ({ publish: jest.fn() }));

jest.mock('@/services/nearContract', () => ({
  deployOrderPayment: jest.fn(),
  releasePayment: jest.fn(),
  refundPayment: jest.fn(),
}));

jest.mock('@/features/auth/services/nearUsers', () => ({
  getUser: jest.fn(async (id: string) => ({
    id,
    username: id,
    displayName: id,
    isAdmin: false,
    role: 'user',
    address: id,
    chatPublicKey: '',
    customerTier: 'regular' as const,
  })),
}));

jest.mock('@/features/stores/services/nearStores', () => ({
  getStore: jest.fn(async (id: string) => ({ id, name: id, owner: `seller_${id}`, nftId: id })),
}));

jest.mock('@/features/products/services/nearProducts', () => ({
  getProduct: jest.fn(async (id: string) => mockProducts[id] || null),
  setProduct: jest.fn(async (p: any) => {
    mockProducts[p.id] = p;
  }),
}));

jest.mock('@/services/eventLog', () => ({ logOrderEvent: jest.fn() }));

jest.mock('../agents/orders-agent', () => ({
  subscribe: jest.fn(),
  add: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn().mockResolvedValue([]),
  update: jest.fn(),
}));

jest.mock('@/constants/tenant', () => ({
  getFeeSettings: jest.fn().mockResolvedValue({ feeAddress: 'fee_addr', feeBps: 250 }),
}));

beforeAll(async () => {
  const publicKey = await getPublicKey(walletSecretKey);
  walletPublicKeyStr = `ed25519:${nearUtils.serialize.base_encode(publicKey)}`;
});

async function issueCheckoutToken(): Promise<string> {
  let sealed: { cipher: string; walletPublicKey: string; identityPublicKey: string } | undefined;
  const session = await requestScopes(
    ['checkout'],
    async (payload) => {
      sealed = {
        cipher: payload,
        walletPublicKey: walletPublicKeyStr,
        identityPublicKey: 'identity',
      };
      const sig = await sign(Buffer.from(sealed.cipher), walletSecretKey);
      return Buffer.from(sig).toString('base64');
    },
    undefined,
    { sealed: () => sealed },
  );
  return session.token;
}

async function issueInvalidCheckoutToken(): Promise<string> {
  let sealed: { cipher: string; walletPublicKey: string; identityPublicKey: string } | undefined;
  const session = await requestScopes(
    ['checkout'],
    async (payload) => {
      sealed = {
        cipher: payload,
        walletPublicKey: walletPublicKeyStr,
        identityPublicKey: 'identity',
      };
      return 'deadbeef';
    },
    undefined,
    { sealed: () => sealed },
  );
  return session.token;
}

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

    const token = await issueCheckoutToken();
    const orders = await svc.createOrdersFromCart('buyer.near', items, shipping, 'card', token);
    expect(orders).toHaveLength(1);
    const order = orders[0];
    expect(order.total).toBe(100);
    expect(order.platformFee).toBeCloseTo(2.5);
    expect(order.sellerPayout).toBeCloseTo(97.5);
  });

  it('rejects card payments when checkout signature is invalid', async () => {
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

    const token = await issueInvalidCheckoutToken();
    await expect(
      svc.createOrdersFromCart('buyer.near', items, shipping, 'card', token),
    ).rejects.toThrow('{E_SESSION_PROOF}');
  });
});

afterAll(() => {
  jest.resetModules();
});
