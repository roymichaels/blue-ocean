import AsyncStorage from '@react-native-async-storage/async-storage';
import { canonicalJson } from '@/utils/serialization';
import {
  loadKycReceipt,
  subscribeToKycReceipts,
} from '@/services/kycReceipts';
import type { KycReceipt } from '@/services/kycReceipts';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockFetchHistory = jest.fn();
const mockSubscribeWithAck = jest.fn();

jest.mock('@/services/waku', () => ({
  fetchHistory: (...args: any[]) => mockFetchHistory(...args),
  subscribeWithAck: (...args: any[]) => mockSubscribeWithAck(...args),
  publish: jest.fn(),
}));

describe('subscribeToKycReceipts', () => {
  const baseReceipt: KycReceipt = {
    type: 'kyc.receipt',
    payload: {
      receiptId: 'r1',
      buyerPublicKey: 'buyer-public',
      issuerPublicKey: 'issuer-public',
      issuedAt: '2024-01-01T00:00:00.000Z',
      data: { userId: 'user-1' },
      ts: Date.now(),
      nonce: 'abc123',
    },
    sender: { publicKey: 'issuer-public', role: 'admin' },
    signature: 'deadbeef',
    ts: Date.now(),
    nonce: 'abc123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mockFetchHistory.mockResolvedValue(undefined);
    mockSubscribeWithAck.mockResolvedValue(() => {});
  });

  it('persists receipts from history and live updates', async () => {
    mockFetchHistory.mockImplementation(async (_topic: string, cb: (msg: KycReceipt) => void) => {
      await cb(baseReceipt);
    });

    let liveHandler: ((msg: KycReceipt) => void) | undefined;
    mockSubscribeWithAck.mockImplementation(async (_topic: string, cb: (msg: KycReceipt) => void) => {
      liveHandler = cb;
      return () => {};
    });

    const onReceipt = jest.fn();
    await subscribeToKycReceipts('buyer-public', { onReceipt });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'kyc.receipt:buyer-public',
      canonicalJson(baseReceipt),
    );
    expect(onReceipt).toHaveBeenCalledWith(baseReceipt);

    const liveReceipt: KycReceipt = {
      ...baseReceipt,
      payload: { ...baseReceipt.payload, receiptId: 'r2', nonce: 'def456' },
      signature: 'feedface',
    };

    await liveHandler?.(liveReceipt);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'kyc.receipt:buyer-public',
      canonicalJson(liveReceipt),
    );
    expect(onReceipt).toHaveBeenLastCalledWith(liveReceipt);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(canonicalJson(liveReceipt));
    const loaded = await loadKycReceipt('buyer-public');
    expect(loaded?.payload.receiptId).toBe('r2');
  });

  it('notifies errors during history fetch', async () => {
    const error = new Error('history failed');
    mockFetchHistory.mockRejectedValueOnce(error);
    const onError = jest.fn();
    await subscribeToKycReceipts('buyer-public', { onError });
    expect(onError).toHaveBeenCalledWith(error);
  });
});




