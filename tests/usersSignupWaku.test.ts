import usersAgent from '../agents/users-agent';
import { insertConfig } from './testUtils';
import { User } from '../types';

jest.mock('../lib/waku/wakuCrypto', () => ({
  encryptWakuPayload: jest.fn(async (p: string) => p),
  decryptWakuPayload: jest.fn(async (p: string) => p),
}));

jest.mock('@noble/ed25519', () => ({
  verify: jest.fn(async () => true),
  etc: { hexToBytes: jest.fn(() => new Uint8Array()), bytesToHex: jest.fn(() => '') },
}));

const messages: Uint8Array[] = [];
function createMockNode() {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    createEncoder: jest.fn(({ contentTopic }: any) => ({ contentTopic })),
    createDecoder: jest.fn(({ contentTopic }: any) => ({ contentTopic })),
    lightPush: {
      send: jest.fn(async (_enc: any, msg: any) => {
        messages.push(msg.payload);
      }),
    },
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

jest.mock('@waku/sdk', () => ({ createLightNode, waitForRemotePeer, Protocols }), { virtual: true });

jest.mock('../lib/waku/sendWakuUserUpdate', () => ({
  sendWakuUserUpdate: jest.fn(async (user: any) => {
    const payloadObj = { type: 'user.update', user, sender: { id: user.id, publicKey: user.publicKey, role: user.role }, signature: 'sig' };
    const encoded = new TextEncoder().encode(JSON.stringify(payloadObj));
    messages.push(encoded);
  }),
}));
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';

describe('Signup broadcasts over Waku', () => {
  beforeEach(() => {
    (usersAgent as any).store.clear();
    (usersAgent as any).hashCache.clear();
    messages.length = 0;
    jest.clearAllMocks();
    insertConfig({ EXPO_PUBLIC_WAKU_SECRET: 's' });
  });

  it('broadcasts and replays user update', async () => {
    const user: User = {
      id: 'u1',
      username: 'bob',
      displayName: 'Bob',
      role: 'user',
      publicKey: 'pk',
      isAdmin: false,
      isDriver: false,
    };
    await usersAgent.add(user);
    expect(sendWakuUserUpdate).toHaveBeenCalled();

    const AgentClass = (usersAgent as any).constructor;
    const newAgent: any = new AgentClass();
    await (newAgent.ready || Promise.resolve());
    const stored = newAgent.get(user.id);
    expect(stored).toEqual(user);
    await newAgent.stop();
  });
});
