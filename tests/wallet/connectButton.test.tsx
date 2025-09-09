import React from 'react';
import renderer, { act } from 'react-test-renderer';
import WalletConnectButton from '@/features/auth/components/WalletConnectButton';

const mockConnect = jest.fn();

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ address: null, connect: mockConnect }),
}));

describe('WalletConnectButton', () => {
  it('invokes connect on press', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<WalletConnectButton />);
    });
    const btn = root!.root.findByType('Button');
    await act(async () => {
      await btn.props.onPress();
    });
    expect(mockConnect).toHaveBeenCalled();
  });
});
