jest.mock('../utils/ensureNearWallet', () => jest.fn().mockResolvedValue(undefined));

import { Buffer } from 'buffer';

// --- Mocks for Waku client and node ---
const mockSend = jest.fn();
const createEncoderMock = jest.fn(({ contentTopic }) => ({ contentTopic }));

jest.mock('@/services/waku', () => {
  const actual = jest.requireActual('@/services/waku');
  return {
    ...actual,
    ensureNode: jest.fn(async () => ({
      lightPush: { send: (...args: any[]) => mockSend(...args) },
    })),
    isWakuDisabled: jest.fn(() => false),
  };
});

jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => ({
    createEncoder: createEncoderMock,
    utf8ToBytes: (str: string) => Buffer.from(str),
    bytesToUtf8: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

// --- Backlog helpers ---
import {
  publish,
  ensureNode as ensureNodeReal,
} from '@/services/waku';
import {
  E_BACKLOG,
  onBacklog,
  offBacklog,
  setBacklogThreshold,
  snapshot,
  flush,
} from '@/utils/wakuStore';

// Mock encrypt/decrypt as identity to simplify payload checks
jest.mock('@/utils/wakuCrypto', () => ({
  encrypt: async (_t: string, b: Uint8Array) => ({
    primary: { payload: b, keyEpoch: null, format: 'legacy' },
  }),
  decrypt: async (_t: string, b: Uint8Array) => ({
    plaintext: b,
    keyEpoch: null,
    format: 'legacy',
  }),
  getCurrentKeyEpoch: () => 0,
  getSupportedKeyEpochs: () => [0],
  WakuDecryptError: class MockWakuDecryptError extends Error {
    constructor(public code: string) {
      super(code);
      this.name = 'WakuDecryptError';
    }
  },
}));

// observability stubs
jest.mock('@/utils/observability', () => require('@/tests/__mocks__/utils/observability'));

// global logger used by services/waku
;(global as any).logger = { info: jest.fn(), error: jest.fn() };

const notificationsAgent = require('../agents/notifications-agent').default;

describe('notifications pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureNodeReal as jest.Mock).mockResolvedValue({
      lightPush: { send: mockSend },
    });
    setBacklogThreshold(1000);
  });

  it('ingests events and broadcasts localized notifications', async () => {
    const item = {
      id: 'n1',
      userId: 'u1',
      title: 't',
      message: 'm',
      type: 'order' as const,
      read: false,
      timestamp: 1,
    };

    await notificationsAgent.broadcast('order.created', item, 'store42');

    expect(createEncoderMock).toHaveBeenCalledTimes(1);
    expect(createEncoderMock).toHaveBeenCalledWith({
      contentTopic: '/blue-ocean/notifications/1',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [, { payload: rawPayload }] = mockSend.mock.calls[0];
    const envelope = JSON.parse(Buffer.from(rawPayload).toString());
    expect(envelope.type).toBe('notification.broadcast');
    expect(typeof envelope.payload).toBe('string');
    expect(envelope.sender).toEqual(
      expect.objectContaining({ role: 'notifications', publicKey: expect.any(String) }),
    );
    expect(typeof envelope.signature).toBe('string');
    const decoded = JSON.parse(envelope.payload);
    expect(decoded).toEqual({ type: 'order.created', notification: item, storeId: 'store42' });
  });

  it('emits E_BACKLOG when publish queue grows and recovers after flush', async () => {
    const sendFail = jest.fn(async () => {
      throw new Error('offline');
    });
    (ensureNodeReal as jest.Mock).mockResolvedValue({
      lightPush: { send: sendFail },
    });
    setBacklogThreshold(2);
    const backlogSpy = jest.fn();
    onBacklog(backlogSpy);

    await publish('/topic', { a: 1 });
    await publish('/topic', { a: 2 });

    expect(backlogSpy).toHaveBeenCalledWith(E_BACKLOG);
    expect(snapshot()).toHaveLength(2);

    const sendOk = jest.fn(async () => {});
    (ensureNodeReal as jest.Mock).mockResolvedValue({
      lightPush: { send: sendOk },
    });
    await flush((t, p) => sendOk(t, p));

    expect(sendOk).toHaveBeenCalledTimes(2);
    expect(snapshot()).toHaveLength(0);
    offBacklog(backlogSpy);

    backlogSpy.mockClear();
    await publish('/topic', { a: 3 });
    expect(sendOk).toHaveBeenCalledTimes(3);
    expect(backlogSpy).not.toHaveBeenCalled();
  });
});

