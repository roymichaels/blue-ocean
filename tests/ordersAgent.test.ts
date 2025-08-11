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

jest.mock('../services/tonContract', () => ({
  deployOrderPayment: jest.fn().mockResolvedValue({ contractAddress: 'escrow1', txHash: 'tx1' }),
  releasePayment: jest.fn(),
  refundPayment: jest.fn(),
}));

jest.mock('../services/sellerRegistry');
jest.mock('../services/localIdentity');

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

describe('ordersAgent.add', () => {
  it('encrypts shipping address and persists new fields', async () => {
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
  });
});

afterAll(() => {
  jest.resetModules();
});
