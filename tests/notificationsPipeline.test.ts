jest.mock('../utils/ensureNearWallet', () => jest.fn().mockResolvedValue(undefined));

import { Buffer } from 'buffer';

// --- Mocks for Waku client and node ---
const sendMock = jest.fn();
const createEncoderMock = jest.fn(({ contentTopic }) => ({ contentTopic }));

jest.mock('@/services/waku', () => {
  const actual = jest.requireActual('@/services/waku');
  return {
    ...actual,
    ensureNode: jest.fn(async () => ({
      lightPush: { send: (...args: any[]) => sendMock(...args) },
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
  encrypt: (_t: string, b: Uint8Array) => b,
  decrypt: (_t: string, b: Uint8Array) => b,
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
      lightPush: { send: sendMock },
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

    expect(createEncoderMock).toHaveBeenNthCalledWith(1, {
      contentTopic: '/blue-ocean/notifications/store42',
    });
    expect(createEncoderMock).toHaveBeenNthCalledWith(2, {
      contentTopic: '/blue-ocean/orders/store42',
    });
    expect(sendMock).toHaveBeenCalledTimes(2);
    const [, { payload: notifPayload }] = sendMock.mock.calls[0];
    expect(JSON.parse(Buffer.from(notifPayload).toString())).toEqual(item);
    const [, { payload: orderPayload }] = sendMock.mock.calls[1];
    const decoded = JSON.parse(Buffer.from(orderPayload).toString());
    expect(decoded).toEqual({ type: 'order.created', notification: item });
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
