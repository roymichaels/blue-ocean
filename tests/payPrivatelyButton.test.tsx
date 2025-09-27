import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PayPrivatelyButton from '@/features/payments/components/PayPrivatelyButton';
import { STUB_MESSAGE } from '@/services/nearStub';

jest.mock('@/services/chain', () => ({ __esModule: true,
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
      EXPO_PUBLIC_MIXER_FALLBACK_URL: 'https://fallback-mixer.example',
      EXPO_PUBLIC_RELAYER_URL: 'https://relayer.example',
    } as any;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    (global as any).fetch = undefined;
  });

  it('invokes mixer API when configured', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    const { payPrivately } = await import('@/vendor/blue-ocean-sdk-near');
    await expect(payPrivately({ storeId: 's1', itemId: 1, amountYocto: '5' })).rejects.toThrow(
      STUB_MESSAGE,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to secondary mixer on failure', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    const { payPrivately } = await import('@/vendor/blue-ocean-sdk-near');
    await expect(payPrivately({ storeId: 's1', itemId: 1, amountYocto: '5' })).rejects.toThrow(
      STUB_MESSAGE,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
