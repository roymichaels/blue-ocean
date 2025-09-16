import {
  kycReceiptSchema,
  parseKycReceiptMessage,
} from '../schemas/waku/kyc.receipt';

describe('kyc.receipt schema', () => {
  it('parses a valid receipt message', () => {
    const msg = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r1',
        buyerPublicKey: '0xabc',
        issuerPublicKey: '0xdef',
        issuedAt: '2024-01-01T00:00:00Z',
        data: { userId: 'u1' },
        ts: 1700000000000,
        nonce: '123456abcdef',
      },
      sender: { publicKey: '0xdef', role: 'admin' },
      signature: '0xdeadbeef',
    } as const;
    expect(kycReceiptSchema.parse(msg)).toEqual(msg);
    expect(parseKycReceiptMessage(msg)).toEqual(msg);
  });

  it('rejects receipts without nonce', () => {
    const bad = {
      type: 'kyc.receipt',
      payload: {
        receiptId: 'r1',
        buyerPublicKey: '0xabc',
        issuerPublicKey: '0xdef',
        issuedAt: '2024-01-01T00:00:00Z',
        ts: 1700000000000,
      },
      sender: { publicKey: '0xdef', role: 'admin' },
      signature: '0xdeadbeef',
    } as const;
    expect(() => kycReceiptSchema.parse(bad)).toThrow();
    expect(parseKycReceiptMessage(bad)).toBeNull();
  });
});
