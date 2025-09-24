import OrderService from '@/services/orders';
import { deployEscrow } from '@/services/nearContract';
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
  deployEscrow: jest
    .fn()
    .mockImplementation(async (draft: any) => ({
      contractAddress: `escrow_${draft.total}`,
      txHash: `tx_${draft.total}`,
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'pending',
    })),
  releasePayment: jest.fn(),
  refundPayment: jest.fn(),
}));

jest.mock('@/constants/tenant', () => ({
  getFeeSettings: jest
    .fn()
    .mockResolvedValue({ feeAddress: 'fee_addr', feeBps: 250 }),
}));

jest.mock('@/features/auth/services/nearUsers', () => ({
  getUser: jest.fn().mockResolvedValue({ publicKey: 'a'.repeat(64) }),
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
  const createStream = (stores: any[] = []) => {
    const stream: any = {
      read: jest.fn().mockResolvedValue(stores),
      getSnapshot: jest.fn(() => stores),
      subscribe: jest.fn(() => jest.fn()),
      onError: jest.fn(() => jest.fn()),
    };
    stream[Symbol.asyncIterator] = jest.fn(() => ({
      next: jest.fn().mockResolvedValue({ value: stores, done: false }),
      return: jest.fn().mockResolvedValue({ value: undefined, done: true }),
      throw: jest.fn(),
    }));
    return stream;
  };
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
    listStores: jest.fn(() => createStream()),
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

jest.mock('@/agents/orders-agent', () => ({
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

describe('multi-seller checkout flow', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }
    for (const key of Object.keys(mockProducts)) {
      delete mockProducts[key];
    }
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

    const { token } = requestScopes(['checkout'], () => 'sig');
    const orders = await svc.createOrdersFromCart(
      'user1',
      items,
      shipping,
      'near',
      token,
      'nonce-multi-1',
    );
    expect(orders).toHaveLength(2);
    expect(deployEscrow).toHaveBeenCalledTimes(2);
    const totals = orders.map((o) => o.total).sort();
    expect(totals).toEqual([5, 6]);
    expect(orders.every((o) => o.paymentMethod === 'near')).toBe(true);
    const escrows = orders.map((o) => o.escrowAddr).sort();
    expect(escrows).toEqual(['escrow_5', 'escrow_6']);
    expect(orders.every((o) => o.paymentTxHash && o.paymentContractAddress)).toBe(
      true,
    );
    expect(orders.every((o) => o.kycReceiptSignature === 'sig')).toBe(true);
    expect(orders.every((o) => typeof o.kycReceiptHash === 'string')).toBe(true);
    expect(deployEscrow).toHaveBeenCalledWith(
      expect.objectContaining({ kycReceiptHash: expect.any(String) }),
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
    expect(firstPayload.buyerAddress).toBe('buyer_address');
    expect(firstPayload.sellerAddress).toBe('seller_s1');
    expect(firstPayload.payment.method).toBe('near');
    expect(firstPayload.payment.contractAddress).toBe('escrow_5');

    const integrityEvents = eventBus.track.mock.calls.filter(
      (c: any) => c[0] === 'checkout.token_integrity',
    );
    expect(integrityEvents).toEqual(
      expect.arrayContaining([
        [
          'checkout.token_integrity',
          expect.objectContaining({
            tokenValid: true,
            success: true,
            orderNonce: 'nonce-multi-1',
          }),
        ],
      ]),
    );
  });

  it('emits failure analytics when escrow deployment fails', async () => {
    jest
      .spyOn<any, any>(OrderService.prototype as any, 'simulateOrderProgress')
      .mockImplementation(() => {});

    const svc = OrderService.getInstance();

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

    const { deployEscrow } = require('@/services/nearContract');
    (deployEscrow as jest.Mock).mockRejectedValueOnce(new Error('deploy failed'));

    const { token } = requestScopes(['checkout'], () => 'sig');

    await expect(
      svc.createOrdersFromCart('user1', [item], shipping, 'near', token, 'nonce-multi-fail'),
    ).rejects.toThrow('deploy failed');

    const eventBus = require('@/services/eventBus');
    expect(eventBus.track).toHaveBeenCalledWith(
      'checkout.token_integrity',
      expect.objectContaining({
        tokenValid: true,
        success: false,
        orderNonce: 'nonce-multi-fail',
      }),
    );
  });

  it('rejects checkout without a verified kyc receipt', async () => {
    jest
      .spyOn<any, any>(OrderService.prototype as any, 'simulateOrderProgress')
      .mockImplementation(() => {});

    const svc = OrderService.getInstance();

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

    mockUsersAgent.get.mockResolvedValueOnce({
      id: 'user1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: null,
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValueOnce(null);
    (loadKycReceipt as jest.Mock).mockResolvedValueOnce(null);

    const { token } = requestScopes(['checkout'], () => 'sig');

    await expect(
      svc.createOrdersFromCart('user1', [item], shipping, 'near', token, 'nonce-multi-2'),
    ).rejects.toThrow('KYC receipt missing or invalid');

    const eventBus = require('@/services/eventBus');
    expect(eventBus.track).toHaveBeenCalledWith('checkout.token_integrity', {
      tokenValid: true,
      success: false,
    });
  });

  it('rejects checkout when session is missing the checkout scope', async () => {
    jest
      .spyOn<any, any>(OrderService.prototype as any, 'simulateOrderProgress')
      .mockImplementation(() => {});

    const svc = OrderService.getInstance();

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

    const { token } = requestScopes(['read'], () => 'sig');

    await expect(
      svc.createOrdersFromCart('user1', [item], shipping, 'near', token, 'nonce-multi-3'),
    ).rejects.toThrow('{E_SCOPE}');

    const eventBus = require('@/services/eventBus');
    expect(eventBus.track).toHaveBeenCalledWith('checkout.token_integrity', {
      tokenValid: false,
      success: false,
    });
  });
});

afterAll(() => {
  jest.resetModules();
});
