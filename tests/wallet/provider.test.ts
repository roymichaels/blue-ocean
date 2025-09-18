import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { WalletProvider, useWallet } from '@/contexts/WalletProvider';

const mockUseAccount = jest.fn().mockReturnValue('alice.testnet');

jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: {
    init: jest.fn().mockResolvedValue({ error: null }),
    useAccount: mockUseAccount,
    openModal: jest.fn().mockResolvedValue(undefined),
    signMessage: jest.fn().mockResolvedValue('signed'),
    getAccountId: jest.fn().mockReturnValue('alice.testnet'),
    getSelector: jest.fn().mockReturnValue({ wallet: jest.fn() }),
  },
}));

jest.mock('@/features/auth/services/nearUsers', () => ({
  getUser: jest.fn().mockResolvedValue({ role: 'admin' }),
}));

describe('WalletProvider', () => {
  it('connect calls underlying adapter', async () => {
    const { chainAdapter } = require('@/services/chain');
    let connect!: () => Promise<void>;
    const Grabber = () => {
      const wallet = useWallet();
      connect = wallet.connect;
      return null;
    };
    renderer.create(
      React.createElement(WalletProvider, null, React.createElement(Grabber)),
    );
    await act(async () => {
      await connect();
    });
    expect(chainAdapter.openModal).toHaveBeenCalled();
  });

  it('sign delegates to adapter', async () => {
    const { chainAdapter } = require('@/services/chain');
    let sign!: (msg: string) => Promise<string>;
    const Grabber = () => {
      const wallet = useWallet();
      sign = wallet.sign;
      return null;
    };
    renderer.create(
      React.createElement(WalletProvider, null, React.createElement(Grabber)),
    );
    let res = '';
    await act(async () => {
      res = await sign('hello');
    });
    expect(chainAdapter.signMessage).toHaveBeenCalledWith('hello');
    expect(res).toBe('signed');
  });

  it('fetchRole returns user role', async () => {
    const { getUser } = require('@/features/auth/services/nearUsers');
    let fetchRole!: () => Promise<string | null>;
    const Grabber = () => {
      const wallet = useWallet();
      fetchRole = wallet.fetchRole;
      return null;
    };
    renderer.create(
      React.createElement(WalletProvider, null, React.createElement(Grabber)),
    );
    let role: string | null = null;
    await act(async () => {
      role = await fetchRole();
    });
    expect(getUser).toHaveBeenCalledWith('alice.testnet');
    expect(role).toBe('admin');
  });

  it('initializes address from adapter on mount', async () => {
    const { chainAdapter } = require('@/services/chain');
    mockUseAccount.mockReturnValueOnce(null);
    chainAdapter.getAccountId.mockReturnValueOnce('alice.testnet');
    let addr: string | null = null;
    const Grabber = () => {
      const wallet = useWallet();
      addr = wallet.address;
      return null;
    };
    renderer.create(
      React.createElement(WalletProvider, null, React.createElement(Grabber)),
    );
    await act(async () => {});
    expect(addr).toBe('alice.testnet');
  });
});
