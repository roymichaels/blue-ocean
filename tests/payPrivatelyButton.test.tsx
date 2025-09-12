import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PayPrivatelyButton from '@/features/payments/components/PayPrivatelyButton';

jest.mock('@/services/chain', () => ({
  chainAdapter: {
    payPrivately: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockConnect = jest.fn();
const mockUseWallet = jest.fn(() => ({ address: null, connect: mockConnect }));

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: mockUseWallet,
}));

describe('PayPrivatelyButton', () => {
  it('prompts connect when no account', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(
        <PayPrivatelyButton listingId={1} amountYocto="10" />,
      );
    });
    const btn = root!.root.findByProps({ testID: 'pay-privately-button' });
    await act(async () => {
      await btn.props.onPress();
    });
    expect(mockConnect).toHaveBeenCalled();
  });

  it('calls payPrivately when account exists', async () => {
    const { chainAdapter } = require('@/services/chain');
    mockUseWallet.mockReturnValue({ address: 'alice.testnet', connect: jest.fn() });
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(
        <PayPrivatelyButton listingId={2} amountYocto="20" />,
      );
    });
    const btn = root!.root.findByProps({ testID: 'pay-privately-button' });
    await act(async () => {
      await btn.props.onPress();
    });
    expect(chainAdapter.payPrivately).toHaveBeenCalledWith({
      id: 2,
      buyer: 'alice.testnet',
      amountYocto: '20',
    });
  });
});

describe('payPrivately mixer integration', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      EXPO_PUBLIC_MIXER_URL: 'https://mixer.example',
      EXPO_PUBLIC_RELAYER_URL: 'https://relayer.example',
    } as any;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    (global as any).fetch = undefined;
  });

  it('invokes mixer API when configured', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ proof: 'abc' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    (global as any).fetch = fetchMock;
    const { payPrivately } = await import('@blue-ocean/sdk-near');
    await payPrivately({ storeId: 's1', itemId: 1, amountYocto: '5' });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://mixer.example/proof', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://mixer.example/mix', expect.any(Object));
  });

  it('falls back to buyListing on mixer failure', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('mixer down'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    (global as any).fetch = fetchMock;
    const sdk = await import('@blue-ocean/sdk-near');
    const buySpy = jest.spyOn(sdk, 'buyListing').mockResolvedValue('fallback');
    const res = await sdk.payPrivately({ storeId: 's1', itemId: 1, amountYocto: '5' });
    expect(buySpy).toHaveBeenCalled();
    expect(res).toBe('fallback');
  });
});
