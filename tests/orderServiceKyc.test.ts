import OrderService from '@/services/orders';
import { loadKycReceipt } from '@/services/kycReceipts';
import { canonicalJson } from '@/utils/serialization';
import { sha256 } from '@noble/hashes/sha256';

const mockUsersAgent = {
  get: jest.fn(),
  getKycReceiptHash: jest.fn(),
  subscribe: jest.fn(),
  getAll: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  requestKyc: jest.fn(),
  updateKyc: jest.fn(),
  remove: jest.fn(),
};

jest.mock('@/agents/users-agent', () => ({
  __esModule: true,
  default: mockUsersAgent,
}));

const mockVerifyMessageSignature = jest.fn().mockResolvedValue(true);
jest.mock('@/utils/verifyMessageSignature', () => ({
  verifyMessageSignature: (...args: any[]) => mockVerifyMessageSignature(...args),
}));

jest.mock('@/services/kycReceipts', () => ({
  loadKycReceipt: jest.fn(),
}));

const mockGetStore = jest.fn();
jest.mock('@/features/stores/services/nearStores', () => {
  const selectStore = jest.fn((...args: any[]) => mockGetStore(...args));
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

jest.mock('@/agents/orders-agent', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
  },
}));

jest.mock('@/services/eventBus', () => ({ publish: jest.fn(), track: jest.fn() }));

const mockSettingsAgent = {
  getAdminPublicKeys: jest.fn(),
};

jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: { getInstance: () => mockSettingsAgent },
}));

describe('OrderService.verifyKycReceipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsAgent.getAdminPublicKeys.mockResolvedValue(['issuer']);
    mockVerifyMessageSignature.mockResolvedValue(true);
  });

  it('returns stored hash for stores requiring KYC', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    const receipt = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r1',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: new Date().toISOString(),
        data: {},
        ts: 1,
        nonce: 'nonce-1',
      },
      sender: { publicKey: 'issuer', role: 'admin' },
      signature: 'sig',
    };
    const expectedHash = Buffer.from(
      sha256(Buffer.from(canonicalJson(receipt.payload))),
    ).toString('hex');
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: expectedHash,
      kycReceiptSig: 'sig',
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(expectedHash);
    (loadKycReceipt as jest.Mock).mockResolvedValue(receipt);

    const svc = OrderService.getInstance() as any;
    const result = await svc.verifyKycReceipt('buyer1', 'store1');
    expect(result).toEqual(
      expect.objectContaining({ ok: true, hash: expectedHash, receiptId: 'r1', signature: 'sig' }),
    );
  });

  it('derives hash from receipt when storage missing', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: null,
      kycReceiptSig: null,
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(null);
    const receipt = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r2',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: new Date().toISOString(),
        data: {},
        ts: 2,
        nonce: 'nonce-2',
      },
      sender: { publicKey: 'issuer', role: 'admin' },
      signature: 'sig2',
    };
    (loadKycReceipt as jest.Mock).mockResolvedValue(receipt);
    const expectedHash = Buffer.from(
      sha256(Buffer.from(canonicalJson(receipt.payload))),
    ).toString('hex');

    const svc = OrderService.getInstance() as any;
    const result = await svc.verifyKycReceipt('buyer1', 'store1');
    expect(result).toEqual(
      expect.objectContaining({ ok: true, hash: expectedHash, receiptId: 'r2', signature: 'sig2' }),
    );
  });

  it('throws when KYC is required and no receipt is available', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: null,
      kycReceiptSig: null,
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(null);
    (loadKycReceipt as jest.Mock).mockResolvedValue(null);

    const svc = OrderService.getInstance() as any;
    await expect(svc.verifyKycReceipt('buyer1', 'store1')).rejects.toThrow('{E_SCOPE}');
  });

  it('allows stores without KYC requirement', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: false } });
    mockUsersAgent.get.mockResolvedValue(null);
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(null);
    (loadKycReceipt as jest.Mock).mockResolvedValue(null);

    const svc = OrderService.getInstance() as any;
    const result = await svc.verifyKycReceipt('buyer1', 'store1');
    expect(result).toEqual(expect.objectContaining({ ok: true, hash: null }));
  });

  it('rejects forged signatures', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    const receipt = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r3',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: new Date().toISOString(),
        data: {},
        ts: 3,
        nonce: 'nonce-3',
      },
      sender: { publicKey: 'issuer', role: 'admin' },
      signature: 'sig',
    };
    const hash = Buffer.from(sha256(Buffer.from(canonicalJson(receipt.payload)))).toString('hex');
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: hash,
      kycReceiptSig: 'sig',
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(hash);
    mockVerifyMessageSignature.mockResolvedValue(false);
    (loadKycReceipt as jest.Mock).mockResolvedValue(receipt);

    const svc = OrderService.getInstance() as any;
    await expect(svc.verifyKycReceipt('buyer1', 'store1')).rejects.toThrow('{E_UNAUTHORIZED}');
  });

  it('rejects expired receipts', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    const storedHash = 'stored-hash';
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: storedHash,
      kycReceiptSig: 'sig',
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(storedHash);
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const receipt = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r4',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: staleDate,
        data: {},
        ts: 4,
        nonce: 'nonce-4',
      },
      sender: { publicKey: 'issuer', role: 'admin' },
      signature: 'sig',
    };
    (loadKycReceipt as jest.Mock).mockResolvedValue(receipt);
    const hash = Buffer.from(sha256(Buffer.from(canonicalJson(receipt.payload)))).toString('hex');
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(hash);
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: hash,
      kycReceiptSig: 'sig',
    });

    const svc = OrderService.getInstance() as any;
    await expect(svc.verifyKycReceipt('buyer1', 'store1')).rejects.toThrow('{E_SCOPE}');
  });

  it('guards against replayed receipt nonces', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    const receipt = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r5',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: new Date().toISOString(),
        data: {},
        ts: 5,
        nonce: 'nonce-5',
      },
      sender: { publicKey: 'issuer', role: 'admin' },
      signature: 'sig',
    };
    const hash = Buffer.from(sha256(Buffer.from(canonicalJson(receipt.payload)))).toString('hex');
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: hash,
      kycReceiptSig: 'sig',
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(hash);
    (loadKycReceipt as jest.Mock).mockResolvedValue(receipt);

    const svc = OrderService.getInstance() as any;
    await svc.verifyKycReceipt('buyer1', 'store1');
    await expect(svc.verifyKycReceipt('buyer1', 'store1')).rejects.toThrow('{E_REPLAY}');
  });
});
