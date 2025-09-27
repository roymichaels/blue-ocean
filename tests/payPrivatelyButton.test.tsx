import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PayPrivatelyButton from '@/features/payments/components/PayPrivatelyButton';

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
