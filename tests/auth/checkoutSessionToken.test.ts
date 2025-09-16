import { Buffer } from 'buffer';
import { getPublicKey, sign } from '@noble/ed25519';
import { utils as nearUtils } from 'near-api-js';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import OrderService from '@/services/orders';
import { CartItem, ShippingAddress } from '@/types';

const walletSecretKey = Uint8Array.from({ length: 32 }, (_, i) => 7 + i);
let walletPublicKeyStr = 'ed25519:';

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({
    address: 'buyer.near',
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    sign: jest.fn(async (message: Uint8Array | string) => {
      const bytes = typeof message === 'string' ? Buffer.from(message) : Buffer.from(message);
      const sig = await sign(bytes, walletSecretKey);
      return Buffer.from(sig).toString('base64');
    }),
  }),
}));

jest.mock('@/services/chain', () => ({
  chainAdapter: {
    init: jest.fn(async () => ({})),
    useAccount: jest.fn(() => 'buyer.near'),
    openModal: jest.fn(),
    getSelector: jest.fn(() => ({ wallet: async () => ({ signOut: jest.fn() }) })),
    getAccountId: jest.fn(() => 'buyer.near'),
    getPublicKey: jest.fn(() => walletPublicKeyStr),
    signMessage: jest.fn(),
  },
}));

const store: Record<string, any> = {};
jest.mock('@/services/nearOrders', () => ({
  setOrder: jest.fn(async (o: any) => { store[o.id] = o; }),
  getOrder: jest.fn(async (id: string) => store[id] || null),
  listOrders: jest.fn().mockResolvedValue([]),
  removeOrder: jest.fn(),
  listOrdersBySeller: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/services/eventBus', () => ({ publish: jest.fn(), track: jest.fn() }));

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
  setUser: jest.fn(),
}));

jest.mock('@/features/stores/services/nearStores', () => ({
  getStore: jest.fn(async (id: string) => ({ id, name: id, owner: `seller_${id}` })),
}));

const mockProducts: Record<string, any> = {};
jest.mock('@/features/products/services/nearProducts', () => ({
  getProduct: jest.fn(async (id: string) => mockProducts[id] || null),
  setProduct: jest.fn(async (p: any) => { mockProducts[p.id] = p; }),
}));

jest.mock('@/services/eventLog', () => ({ logOrderEvent: jest.fn() }));

const addMock = jest.fn();
jest.mock('../../agents/orders-agent', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
    add: addMock,
    get: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
}));

beforeAll(async () => {
  const publicKey = await getPublicKey(walletSecretKey);
  walletPublicKeyStr = `ed25519:${nearUtils.serialize.base_encode(publicKey)}`;
});

function Grab() {
  (Grab as any).ctx = useAuth();
  return null;
}

describe('login issues session token used in checkout', () => {
  it('creates an order with attached session token', async () => {
    const svc = OrderService.getInstance();
    await act(async () => {
      renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Grab, null)),
      );
    });
    const ctx = (Grab as any).ctx;
    await act(async () => {
      await ctx.login();
    });
    expect(ctx.sessionToken).toBeTruthy();

    const item: CartItem = {
      id: 'i1',
      productId: 'p1',
      product: {
        id: 'p1',
        name: 'P1',
        price: 5,
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
    };
    mockProducts['p1'] = { ...item.product };

    const shipping: ShippingAddress = {
      name: 'A',
      phone: '1',
      street: 'st',
      city: 'c',
      postalCode: 'p',
    };

    await svc.createOrdersFromCart('buyer.near', [item], shipping, 'cash_on_delivery', ctx.sessionToken!);

    expect(addMock).toHaveBeenCalled();
    const passedOrder = addMock.mock.calls[0][0];
    expect(passedOrder.sessionToken).toBe(ctx.sessionToken);
  });
});

