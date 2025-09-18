import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';

const mockPublish = jest.fn();
const mockMakeSignedWakuMessage = jest.fn();
const mockUseWallet = jest.fn();
const mockUsersAgentAdd = jest.fn();
const mockGetAccountId = jest.fn();
const mockUseAccount = jest.fn();
const nearUsersStore: Record<string, any> = {};
const mockGetChainUser = jest.fn(async (id: string) => nearUsersStore[id] ?? null);
const mockSetChainUser = jest.fn(async (user: any) => {
  nearUsersStore[user.id] = user;
});
const mockGetAdmins = jest.fn();
const mockSettingsInstance = {
  getAdmins: (...args: Parameters<typeof mockGetAdmins>) => mockGetAdmins(...args),
};
const storage: Record<string, string> = {};
const mockGetItem = jest.fn(async (key: string) => storage[key] ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  storage[key] = value;
  return Promise.resolve();
});
const mockRemoveItem = jest.fn(async (key: string) => {
  delete storage[key];
});

jest.mock('@/services/waku', () => ({
  __esModule: true,
  publish: (...args: Parameters<typeof mockPublish>) => mockPublish(...args),
}));

jest.mock('@/utils/wakuSigning', () => ({
  makeSignedWakuMessage: (
    ...args: Parameters<typeof mockMakeSignedWakuMessage>
  ) => mockMakeSignedWakuMessage(...args),
}));

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => mockUseWallet(),
}));

jest.mock('@/agents/users-agent', () => ({
  __esModule: true,
  default: {
    add: (...args: Parameters<typeof mockUsersAgentAdd>) => mockUsersAgentAdd(...args),
    update: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
    removeItem: (key: string) => mockRemoveItem(key),
  },
}));

jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockSettingsInstance,
  },
}));

jest.mock('@/services/localIdentity', () => ({
  getEd25519KeyPair: jest.fn(async () => ({
    publicKey: new Uint8Array([1, 2, 3, 4]),
  })),
}));

jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: {
    getAccountId: (...args: Parameters<typeof mockGetAccountId>) =>
      mockGetAccountId(...args),
    useAccount: (...args: Parameters<typeof mockUseAccount>) => mockUseAccount(...args),
  },
}));

jest.mock('@/features/auth/services/nearUsers', () => ({
  getUser: (id: string) => mockGetChainUser(id),
  setUser: (user: any) => mockSetChainUser(user),
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function Capture() {
  useAuth();
  return null;
}

describe('AuthProvider admin bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(nearUsersStore).forEach((key) => delete nearUsersStore[key]);
    Object.keys(storage).forEach((key) => delete storage[key]);
    mockGetAdmins.mockResolvedValue([]);
    mockUsersAgentAdd.mockResolvedValue(undefined);
    mockUseWallet.mockReturnValue({
      address: 'alice.near',
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    });
    mockGetAccountId.mockReturnValue('alice.near');
    mockUseAccount.mockReturnValue('alice.near');
    mockMakeSignedWakuMessage.mockImplementation(async (type, payload, role) => ({
      type,
      payload,
      sender: { publicKey: 'pub-key', role },
      signature: 'sig',
      ts: 123,
      nonce: 'nonce',
    }));
    mockPublish.mockResolvedValue('message-1');
  });

  it('publishes admin.joinRequested for the first wallet profile', async () => {
    await act(async () => {
      renderer.create(
        <AuthProvider>
          <Capture />
        </AuthProvider>,
      );
      await flushPromises();
    });
    await flushPromises();

    expect(mockGetAdmins).toHaveBeenCalledTimes(1);
    const [type, payload, role] = mockMakeSignedWakuMessage.mock.calls[0];
    expect(type).toBe('admin.joinRequested');
    expect(payload).toMatchObject({ address: 'alice.near' });
    expect(role).toBe('user');

    expect(mockPublish).toHaveBeenCalledWith(
      '/blue-ocean/users/1',
      expect.objectContaining({
        type: 'admin.joinRequested',
        sender: expect.objectContaining({ role: 'user' }),
      }),
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      expect.stringMatching(/^auth\.adminBootstrap:/),
      '1',
    );
  });
});
