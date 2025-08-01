import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../components/AuthContext';
import usersAgent from '../agents/users-agent';
import { Platform } from 'react-native';
import { insertConfig } from './testUtils';

jest.mock('../lib/waku/wakuCrypto', () => ({
  encryptWakuPayload: jest.fn(async (p: string) => p),
  decryptWakuPayload: jest.fn(async (p: string) => p),
}));

const messages: Uint8Array[] = [];
function createMockNode() {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    createEncoder: jest.fn(({ contentTopic }: any) => ({ contentTopic })),
    createDecoder: jest.fn(({ contentTopic }: any) => ({ contentTopic })),
    lightPush: { send: jest.fn() },
    filter: { subscribe: jest.fn(), unsubscribe: jest.fn() },
    store: {
      queryWithOrderedCallback: jest.fn(async (_d: any, cb: any) => {
        for (const p of messages) {
          await cb({ payload: p });
        }
      }),
    },
  };
}

const createLightNode = jest.fn(async () => createMockNode());
const waitForRemotePeer = jest.fn(async () => undefined);
const Protocols = { Store: 'store', LightPush: 'lightpush' };

jest.mock('@waku/sdk', () => ({ createLightNode, waitForRemotePeer, Protocols }), {
  virtual: true,
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => {}),
  getItem: jest.fn(async (key: string) => (key === 'ed25519_private_key' ? 'priv' : null)),
  removeItem: jest.fn(async () => {}),
}));

jest.mock('@noble/ed25519', () => ({
  verify: jest.fn(async () => true),
  getPublicKeyAsync: jest.fn(async () => new Uint8Array()),
  etc: {
    hexToBytes: jest.fn(() => new Uint8Array()),
    bytesToHex: jest.fn(() => 'pubkey'),
  },
}));

const user = {
  id: 'u1',
  username: 'alice',
  displayName: 'Alice',
  role: 'user',
  publicKey: 'pubkey',
  isAdmin: false,
  isDriver: false,
};

function Wrapper() {
  // expose auth for assertions
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth();
  (Wrapper as any).auth = auth;
  return null;
}

beforeEach(() => {
  (usersAgent as any).store.clear();
  (usersAgent as any).hashCache.clear();
  messages.length = 0;
  jest.clearAllMocks();
  (Platform as any).OS = 'web';
  insertConfig({ EXPO_PUBLIC_USE_WAKU: 'true' });
  const payloadObj = {
    type: 'user.update',
    user,
    sender: { id: user.id, publicKey: user.publicKey, role: user.role },
    signature: 'sig',
  };
  messages.push(new TextEncoder().encode(JSON.stringify(payloadObj)));
});

test('restores user from private key via Waku replay', async () => {
  await act(async () => {
    renderer.create(
      <AuthProvider>
        <Wrapper />
      </AuthProvider>,
    );
    // wait for effects
    await Promise.resolve();
  });
  const auth = (Wrapper as any).auth;
  expect(auth.user).toEqual(user);
});

