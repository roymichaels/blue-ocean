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

jest.mock('@/services/kycReceipts', () => ({
  loadKycReceipt: jest.fn(),
}));

const mockGetStore = jest.fn();
jest.mock('@/features/stores/services/nearStores', () => ({
  getStore: (...args: any[]) => mockGetStore(...args),
}));

jest.mock('@/agents/orders-agent', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
  },
}));

jest.mock('@/services/eventBus', () => ({ publish: jest.fn(), track: jest.fn() }));

describe('OrderService.verifyKycReceipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stored hash for stores requiring KYC', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: 'stored-hash',
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue('stored-hash');
    (loadKycReceipt as jest.Mock).mockResolvedValue({
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r1',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: new Date(0).toISOString(),
        data: {},
        ts: 1,
        nonce: 'n',
      },
      sender: { publicKey: 'issuer', role: 'admin' },
      signature: 'sig',
    });

    const svc = OrderService.getInstance() as any;
    const result = await svc.verifyKycReceipt('buyer1', 'store1');
    expect(result).toEqual(
      expect.objectContaining({ ok: true, hash: 'stored-hash', receiptId: 'r1', signature: 'sig' }),
    );
  });

  it('derives hash from receipt when storage missing', async () => {
    mockGetStore.mockResolvedValue({ policies: { kycRequired: true } });
    mockUsersAgent.get.mockResolvedValue({
      id: 'buyer1',
      kycStatus: 'verified',
      chatPublicKey: 'buyer-public-key',
      kycReceiptHash: null,
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(null);
    const receipt = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r2',
        buyerPublicKey: 'buyer-public-key',
        issuerPublicKey: 'issuer',
        issuedAt: new Date(0).toISOString(),
        data: {},
        ts: 2,
        nonce: 'n',
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
    });
    mockUsersAgent.getKycReceiptHash.mockResolvedValue(null);
    (loadKycReceipt as jest.Mock).mockResolvedValue(null);

    const svc = OrderService.getInstance() as any;
    await expect(svc.verifyKycReceipt('buyer1', 'store1')).rejects.toThrow('E_KYC_REQUIRED');
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
});
