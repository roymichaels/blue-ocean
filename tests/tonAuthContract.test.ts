import { createHash } from 'crypto';
import * as tonAuth from '../services/tonAuth';

jest.mock('../services/tonSettings', () => ({
  fetchSettings: jest.fn().mockResolvedValue({
    feeAddress: 'feeAddr',
    feePercent: 5,
  }),
}));

import {
  deployOrderPayment,
  releasePayment,
  refundPayment,
  ORDER_PAYMENT_FACTORY_ADDRESS,
} from '../services/tonContract';

describe('tonAuth.requestSignature', () => {
  it('uses TonConnect signData', async () => {
    const mockTonConnect = {
      signData: jest.fn().mockResolvedValue({ signature: 'abc' }),
    };
    (tonAuth as any).tonConnect = mockTonConnect;
    const payload = { hello: 'world' };
    const result = await tonAuth.requestSignature(payload);
    expect(mockTonConnect.signData).toHaveBeenCalledWith(payload);
    expect(result).toBe('abc');
    (tonAuth as any).tonConnect = null;
  });
});

describe('Ton contract flows', () => {
  const bocBytes = Buffer.from([1, 2, 3]);
  const boc = bocBytes.toString('base64');
  const expectedHash = createHash('sha256')
    .update(Buffer.from(boc, 'base64'))
    .digest('hex');
  const mockTonConnect = {
    sendTransaction: jest.fn().mockResolvedValue({ boc }),
  } as any;

  beforeEach(() => {
    jest.spyOn(tonAuth, 'getTonConnect').mockReturnValue(mockTonConnect);
    jest.clearAllMocks();
  });

  it('deploys order payment via TonConnect', async () => {
    const result = await deployOrderPayment(5);
    expect(mockTonConnect.sendTransaction).toHaveBeenCalled();
    const sent = mockTonConnect.sendTransaction.mock.calls[0][0];
    expect(sent.messages[0].address).toBe(ORDER_PAYMENT_FACTORY_ADDRESS);
    expect(result.contractAddress).toBe(ORDER_PAYMENT_FACTORY_ADDRESS);
    expect(result.txHash).toBe(expectedHash);
  });

  it('releases payment through TonConnect', async () => {
    const res = await releasePayment('contract1');
    expect(mockTonConnect.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({ address: 'contract1', amount: '0' }),
        ],
      }),
    );
    expect(res).toBe(expectedHash);
  });

  it('refunds payment through TonConnect', async () => {
    const res = await refundPayment('contract1');
    expect(mockTonConnect.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({ address: 'contract1', amount: '0' }),
        ],
      }),
    );
    expect(res).toBe(expectedHash);
  });
});

