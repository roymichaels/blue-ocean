import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import * as nearUsers from '@/features/auth/services/nearUsers';
import { chainAdapter } from '@/services/chain';

jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: {
    init: jest.fn(),
    useAccount: jest.fn(),
    openModal: jest.fn(),
    getSelector: jest.fn(() => ({ wallet: async () => ({ signOut: jest.fn() }) })),
  },
}));

const mockChain = chainAdapter as unknown as {
  init: jest.Mock;
  useAccount: jest.Mock;
};

function Capture() {
  (Capture as any).ctx = useAuth();
  return null;
}

describe('Auth role refresh on session start', () => {
  it('invalidates stale roles when starting a new session', async () => {
    mockChain.useAccount.mockReturnValue('alice.near');
    mockChain.init.mockResolvedValue(undefined);

    await nearUsers.setUser({
      id: 'alice.near',
      username: 'alice.near',
      displayName: 'alice.near',
      isAdmin: true,
      address: 'alice.near',
      role: 'admin',
      chatPublicKey: '',
    });

    await act(async () => {
      renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Capture, null)),
      );
    });

    let ctx = (Capture as any).ctx;
    expect(ctx.isAdmin).toBe(true);

    await nearUsers.setUser({
      id: 'alice.near',
      username: 'alice.near',
      displayName: 'alice.near',
      isAdmin: false,
      address: 'alice.near',
      role: 'user',
      chatPublicKey: ctx.user?.chatPublicKey || '',
    });

    await act(async () => {
      renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Capture, null)),
      );
    });

    ctx = (Capture as any).ctx;
    expect(ctx.isAdmin).toBe(false);
  });
});
