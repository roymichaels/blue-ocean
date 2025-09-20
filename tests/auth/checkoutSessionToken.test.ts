import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import OrderService from '@/services/orders';
import { CartItem, ShippingAddress } from '@/types';
import { requestScopes } from '@/services/session';
import { Buffer } from 'buffer';
import { loadKycReceipt } from '@/services/kycReceipts';
import { canonicalJson } from '@/utils/serialization';
import { getDeviceHash } from '@/utils/getDeviceHash';
import { sha256 } from '@noble/hashes/sha256';

(global as any).Buffer = Buffer;

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children || null,
}));

const deviceHash = getDeviceHash();

const makeReceipt = (buyerPublicKey = 'buyer-public-key') => ({
  type: 'kyc.receipt',
  payload: {
    receiptId: 'receipt-123',
    buyerPublicKey,
    issuerPublicKey: 'issuer',
    issuedAt: new Date().toISOString(),
    data: { deviceHash },
    ts: Date.now(),
    nonce: 'nonce',
  },
  sender: { publicKey: 'issuer', role: 'admin' },
  signature: 'sig',
});

jest.mock('@waku/sdk', () => ({}), { virtual: true });

jest.mock('@/services/localIdentity', () => ({
  getPublicKeyHex: jest.fn().mockResolvedValue('buyer-public-key'),
}));

jest.mock('@/services/kycReceipts', () => ({
  loadKycReceipt: jest.fn(),
  issueKycReceipt: jest.fn(),
}));

jest.mock('@/utils/verifyMessageSignature', () => ({
  verifyMessageSignature: jest.fn().mockResolvedValue(true),
}));

const mockSettingsAgent = {
  getAdminPublicKeys: jest.fn().mockResolvedValue(['issuer']),
};

jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: { getInstance: () => mockSettingsAgent },
}));

jest.mock('@noble/hashes/sha256', () => ({
  sha256: () => new Uint8Array(32),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Alert: { alert: jest.fn() },
  };
});

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({
    address: 'buyer.near',
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    sign: jest.fn().mockResolvedValue('signature'),
  }),
}));

jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: {
    useAccount: jest.fn().mockReturnValue(null),
    getAccountId: jest.fn().mockReturnValue('buyer.near'),
    getPublicKey: jest.fn().mockReturnValue('pubkey'),
    openModal: jest.fn(),
    getSelector: jest.fn().mockReturnValue({ wallet: async () => ({ signOut: jest.fn() }) }),
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

jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: jest.fn().mockReturnValue('buyer.near'),
  getPublicKey: jest.fn().mockReturnValue('pub:buyer'),
  signIn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/stores/services/nearStores', () => {
  const selectStore = jest.fn(async (id: string) => ({
    id,
    name: id,
    owner: `seller_${id}`,
    policies: { kycRequired: true },
  }));
  const setStore = jest.fn();
  const service = {
    mintStore: jest.fn(),
    selectStore,
    listStores: jest.fn(),
    addStore: jest.fn(),
    updateStore: jest.fn(),
    removeStore: jest.fn(),
    setStore,
    createStoreOnChain: jest.fn(),
  };
  return {
    __esModule: true,
    getStore: selectStore,
    setStore,
    listStores: service.listStores,
    createStoreOnChain: service.createStoreOnChain,
    createDefaultStoreServiceDeps: jest.fn(() => ({})),
    createStoreService: jest.fn(() => service),
    storesWarmCache: {
      getById: jest.fn(),
      list: jest.fn(() => []),
      subscribe: jest.fn(() => jest.fn()),
      mutate: jest.fn(),
      onSynced: jest.fn(() => jest.fn()),
    },
  };
});

const mockUsersAgent = {
  get: jest.fn(),
  getKycReceiptHash: jest.fn(),
  getAll: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  requestKyc: jest.fn(),
  updateKyc: jest.fn(),
  remove: jest.fn(),
  subscribe: jest.fn(),
};

jest.mock('@/agents/users-agent', () => ({
  __esModule: true,
  default: mockUsersAgent,
}));

const mockProducts: Record<string, any> = {};
jest.mock('@/features/products/services/nearProducts', () => ({
  getProduct: jest.fn(async (_storeId: string, id: string) => mockProducts[id] || null),
  setProduct: jest.fn(async (p: any) => {
    mockProducts[p.id] = p;
  }),
}));

jest.mock('@/services/eventLog', () => ({ logOrderEvent: jest.fn() }));

const mockAddOrder = jest.fn();
jest.mock('@/agents/orders-agent', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
    add: mockAddOrder,
    get: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
}));

const ordersAgentModule = require('@/agents/orders-agent');

function Grab() {
  (Grab as any).ctx = useAuth();
  return null;
}

describe('login issues session token used in checkout', () => {
  beforeEach(() => {
    mockAddOrder.mockClear();
    ordersAgentModule.default.add = mockAddOrder;
    Object.values(mockUsersAgent).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as jest.Mock).mockReset();
      }
    });
    const receipt = makeReceipt();
    const receiptHash = Buffer.from(
      sha256(Buffer.from(canonicalJson(receipt.payload)))
    ).toString('hex');
    (loadKycReceipt as jest.Mock).mockResolvedValue(receipt);
    mockUsersAgent.get.mockResolvedValue({
      id: 'user1',
      kycStatus: 'verified',
      chatPublicKey: receipt.payload.buyerPublicKey,
      kycReceiptHash: receiptHash,
      kycReceiptSig: receipt.signature,
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(receiptHash);
    mockSettingsAgent.getAdminPublicKeys.mockResolvedValue(['issuer']);
  });

  it('creates an order with attached session token', async () => {
    const svc = OrderService.getInstance() as any;
    await act(async () => {
      renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Grab, null)),
      );
    });
    const ctx = (Grab as any).ctx;
    await act(async () => {
      await ctx.login();
    });

    act(() => {
      requestScopes(['read', 'checkout'], () => 'checkout-token');
    });

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

    await svc.createOrdersFromCart(
      'user1',
      [item],
      shipping,
      'cash_on_delivery',
      'checkout-token',
      'nonce-auth-1',
    );

    expect(mockAddOrder).toHaveBeenCalled();
    const passedOrder = mockAddOrder.mock.calls[0][0];
    expect(passedOrder.sessionToken).toBe('checkout-token');
    expect(passedOrder.kycReceiptSignature).toBe('sig');
    expect(typeof passedOrder.kycReceiptHash).toBe('string');
    expect(passedOrder.kycReceiptHash).toHaveLength(64);
  });
});

