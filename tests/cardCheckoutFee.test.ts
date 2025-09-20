import OrderService from '@/services/orders';
import { CartItem, ShippingAddress } from '../types';
import { requestScopes } from '@/services/session';
import { loadKycReceipt } from '@/services/kycReceipts';
import { canonicalJson } from '@/utils/serialization';
import { sha256 } from '@noble/hashes/sha256';
import { getDeviceHash } from '@/utils/getDeviceHash';

const mockStore: Record<string, any> = {};
const mockProducts: Record<string, any> = {};

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

jest.mock('@/services/nearOrders', () => ({
  setOrder: jest.fn(async (o: any) => { mockStore[o.id] = o; }),
  getOrder: jest.fn(async (id: string) => mockStore[id] || null),
  listOrders: jest.fn().mockResolvedValue([]),
  removeOrder: jest.fn(),
  listOrdersBySeller: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/services/eventBus', () => ({ publish: jest.fn(), track: jest.fn() }));

jest.mock('@/services/nearContract', () => ({
  deployEscrow: jest.fn(),
  releasePayment: jest.fn(),
  refundPayment: jest.fn(),
}));

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

jest.mock('@/features/stores/services/nearStores', () => {
  const selectStore = jest.fn(async (id: string) => ({
    id,
    name: id,
    owner: `seller_${id}`,
    nftId: id,
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

jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: jest.fn().mockReturnValue('buyer_address'),
  getPublicKey: jest.fn().mockReturnValue('pub:buyer_address'),
  signIn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/constants/tenant', () => ({
  getFeeSettings: jest.fn().mockResolvedValue({ feeAddress: 'fee_addr', feeBps: 250 }),
}));

describe('card checkout fee deduction', () => {
  beforeEach(() => {
    Object.values(mockUsersAgent).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as jest.Mock).mockReset();
      }
    });
    const receipt = makeReceipt();
    const receiptHash = Buffer.from(
      sha256(Buffer.from(canonicalJson(receipt.payload))),
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

    const { token } = requestScopes(['checkout'], () => 'sig');
    const orders = await svc.createOrdersFromCart(
      'user1',
      items,
      shipping,
      'card',
      token,
      'nonce-card-1',
    );
    expect(orders).toHaveLength(1);
    const order = orders[0];
    expect(order.total).toBe(100);
    expect(order.platformFee).toBeCloseTo(2.5);
    expect(order.sellerPayout).toBeCloseTo(97.5);
    expect(order.kycReceiptSignature).toBe('sig');
    expect(typeof order.kycReceiptHash).toBe('string');
  });
});

afterAll(() => {
  jest.resetModules();
});
