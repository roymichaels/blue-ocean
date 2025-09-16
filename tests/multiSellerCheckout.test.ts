import { Buffer } from 'buffer';
import { getPublicKey, sign } from '@noble/ed25519';
import { utils as nearUtils } from 'near-api-js';
import OrderService from '@/services/orders';
import { deployOrderPayment } from '@/services/nearContract';
import { CartItem, ShippingAddress } from '../types';
import { requestScopes } from '@/services/session';

const walletSecretKey = Uint8Array.from({ length: 32 }, (_, i) => 32 - i);
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
  deployOrderPayment: jest
    .fn()
    .mockImplementation(async (amount: number) => ({
      contractAddress: `escrow_${amount}`,
      txHash: `tx_${amount}`,
    })),
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

describe('multi-seller checkout flow', () => {
  it('creates separate orders per seller with near payment', async () => {
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
      },
      {
        id: 'i2',
        productId: 'p2',
        product: {
          id: 'p2',
          name: 'P2',
          price: 3,
          description: 'd',
          category: 'c',
          images: [],
          rating: 0,
          reviews: 0,
          storeId: 's2',
          stock: 10,
        },
        quantity: 2,
        addedAt: '',
      },
    ];

    mockProducts['p1'] = { ...items[0].product };
    mockProducts['p2'] = { ...items[1].product };

    const shipping: ShippingAddress = {
      name: 'A',
      phone: '1',
      street: 'st',
      city: 'c',
      postalCode: 'p',
    };

    const token = await issueCheckoutToken();
    const orders = await svc.createOrdersFromCart('buyer.near', items, shipping, 'near', token);
    expect(orders).toHaveLength(2);
    expect(deployOrderPayment).toHaveBeenCalledTimes(2);
    const totals = orders.map((o) => o.total).sort();
    expect(totals).toEqual([5, 6]);
    expect(orders.every((o) => o.paymentMethod === 'near')).toBe(true);
    const escrows = orders.map((o) => o.escrowAddr).sort();
    expect(escrows).toEqual(['escrow_5', 'escrow_6']);
    expect(orders.every((o) => o.paymentTxHash && o.paymentContractAddress)).toBe(
      true,
    );

    const eventBus = require('@/services/eventBus');
    expect(eventBus.publish).toHaveBeenCalledTimes(4);
    const events = eventBus.publish.mock.calls.map((c: any) => c[1]);
    expect(events).toEqual([
      'order.created',
      'escrow.deployed',
      'order.created',
      'escrow.deployed',
    ]);

    const firstPayload = eventBus.publish.mock.calls[0][2];
    expect(firstPayload.orderId).toBe(orders[0].id);
    expect(firstPayload.storeId).toBe('s1');
    expect(firstPayload.buyerAddress).toBe('buyer.near');
    expect(firstPayload.sellerAddress).toBe('seller_s1');
    expect(firstPayload.payment.method).toBe('near');
    expect(firstPayload.payment.contractAddress).toBe('escrow_5');
  });
});

afterAll(() => {
  jest.resetModules();
});
