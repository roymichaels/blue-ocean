import * as nacl from 'tweetnacl';
import { sha256 } from '@noble/hashes/sha256';
import { Order } from '../types';
import { decryptOrderShipping } from '../services/sellerTools';
import { getSellerPublicKey } from '../services/sellerRegistry';
import { getPrivateKey } from '../services/localIdentity';

const mockStore: Record<string, any> = {};

jest.mock('../services/tonOrders', () => ({
  setOrder: jest.fn(async (o: any) => {
    mockStore[o.id] = o;
  }),
  getOrder: jest.fn(async (id: string) => mockStore[id] || null),
  listOrders: jest.fn().mockResolvedValue([]),
  removeOrder: jest.fn(),
  listOrdersBySeller: jest.fn().mockResolvedValue([]),
}));

jest.mock('../agents/notifications-agent', () => ({ broadcast: jest.fn() }));
jest.mock('../agents/stores-agent', () => ({ updateReputationByOwner: jest.fn() }));

const getAdminsMock = jest.fn().mockResolvedValue(['admin']);
jest.mock('../agents/settings-agent', () => ({
  __esModule: true,
  default: { getInstance: () => ({ getAdmins: getAdminsMock }) },
}));

jest.mock('../services/tonContract', () => ({
  deployOrderPayment: jest.fn().mockResolvedValue({ contractAddress: 'escrow1', txHash: 'tx1' }),
  releasePayment: jest.fn(),
  refundPayment: jest.fn(),
}));

jest.mock('../services/sellerRegistry');
jest.mock('../services/localIdentity');
jest.mock('../services/eventLog', () => ({ logOrderEvent: jest.fn() }));

jest.mock('../services/tonAuth', () => ({
  getAddress: jest.fn().mockReturnValue('seller'),
  getTonPublicKey: jest.fn().mockReturnValue('pub'),
  openModal: jest.fn(),
}));

const sellerKey = nacl.sign.keyPair();
const sellerPubEd = Buffer.from(sellerKey.publicKey).toString('hex');
(getSellerPublicKey as jest.Mock).mockResolvedValue(sellerPubEd);
(getPrivateKey as jest.Mock).mockResolvedValue(sellerKey.secretKey);

const ordersAgent = require('../agents/orders-agent').default;
const notificationsAgent = require('../agents/notifications-agent');
const tonAuth = require('../services/tonAuth');

describe('ordersAgent.add', () => {
  it('encrypts shipping address and persists new fields', async () => {
    tonAuth.getAddress.mockReturnValue('seller');
    const items = [{
      id: 'i1',
      productId: 'p1',
      product: {
        id: 'p1',
        name: 'p1',
        price: 5,
        description: 'd',
        category: 'c',
        images: [],
        rating: 0,
        reviews: 0,
        storeId: 's',
        stock: 1,
      },
      quantity: 1,
      addedAt: '',
    }];
    const itemsHash = Buffer.from(sha256(Buffer.from(JSON.stringify(items)))).toString('hex');
    const order: Order = {
      id: 'order1',
      userId: 'u1',
      items,
      total: 5,
      status: 'order_received',
      shippingAddress: {
        name: 'A',
        phone: '1',
        street: 'st',
        city: 'c',
        postalCode: 'p',
      },
      itemsHash,
      paymentMethod: 'ton',
      buyerAddress: 'buyer',
      sellerAddress: 'seller',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingSteps: [],
    };

    await ordersAgent.add(order);
    const stored = mockStore[order.id];
    expect(stored.escrowAddr).toBe('escrow1');
    expect(stored.itemsHash).toBe(itemsHash);
    expect(stored.shipAddrEnc).toBeDefined();
    expect(stored.shippingAddress).toBeUndefined();

    const addr = await decryptOrderShipping(stored);
    expect(addr).toEqual(order.shippingAddress);

    const persisted = await ordersAgent.get(order.id);
    expect(persisted?.escrowAddr).toBe('escrow1');
    expect(persisted?.itemsHash).toBe(itemsHash);
    expect(persisted?.shipAddrEnc).toBeDefined();
  });
});

describe('ordersAgent notification IDs', () => {
  it('generates unique IDs under rapid calls', async () => {
    tonAuth.getAddress.mockReturnValue('seller');
    notificationsAgent.broadcast.mockClear();
    const order = { id: 'o1', userId: 'u1' } as any;
    const notify = (ordersAgent as any).notifyOrderCreated.bind(ordersAgent);
    const originalNow = Date.now;
    Date.now = () => 123;
    try {
      await Promise.all(Array.from({ length: 5 }).map(() => notify(order)));
    } finally {
      Date.now = originalNow;
    }
    const ids = notificationsAgent.broadcast.mock.calls.map((c: any) => c[1].id);
    expect(new Set(ids).size).toBe(ids.length);
    const timestamps = notificationsAgent.broadcast.mock.calls.map((c: any) => c[1].timestamp);
    expect(timestamps.every((ts: number) => ts === 123)).toBe(true);
  });
});

describe('ordersAgent admin authorization', () => {
  it('allows admin to update orders', async () => {
    tonAuth.getAddress.mockReturnValue('admin');
    const order: Order = {
      id: 'order-admin',
      userId: 'u1',
      items: [],
      total: 0,
      status: 'order_received',
      itemsHash: '',
      paymentMethod: 'ton',
      buyerAddress: 'buyer',
      sellerAddress: 'seller',
      createdAt: '',
      updatedAt: '',
      trackingSteps: [],
    } as any;
    mockStore[order.id] = order;
    await expect(
      ordersAgent.update({ ...order, status: 'courier_found' })
    ).resolves.not.toThrow();
    expect(mockStore[order.id].status).toBe('courier_found');
  });
});

afterAll(() => {
  jest.resetModules();
});
