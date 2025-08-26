jest.mock('../utils/ensureTonWallet', () => jest.fn().mockResolvedValue(undefined));

const setNotificationMock = jest.fn();
jest.mock('../services/tonNotifications', () => ({
  setNotification: (...args: any[]) => setNotificationMock(...args),
  getNotification: jest.fn(),
  listNotifications: jest.fn(),
  removeNotification: jest.fn(),
}));

const sendMock = jest.fn();
const startMock = jest.fn().mockResolvedValue(undefined);
const createLightNodeMock = jest.fn().mockResolvedValue({
  start: startMock,
  lightPush: { send: (...args: any[]) => sendMock(...args) },
});
const createEncoderMock = jest.fn(({ contentTopic }: any) => ({ contentTopic }));
const utf8ToBytesMock = jest.fn((str: string) => Buffer.from(str));

jest.mock(
  '@waku/sdk',
  () => ({
    createLightNode: createLightNodeMock as any,
    waitForRemotePeer: jest.fn().mockResolvedValue(undefined),
    createEncoder: createEncoderMock as any,
    Protocols: { Relay: 'relay' },
    utf8ToBytes: utf8ToBytesMock as any,
  }),
  { virtual: true },
);

const notificationsAgent = require('../agents/notifications-agent').default;

describe('notificationsAgent.broadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationsAgent as any).node = null;
  });

  it('encodes event with tenant topic and payload', async () => {
    const item = {
      id: 'id1',
      userId: 'u1',
      title: 't',
      message: 'm',
      type: 'order',
      read: false,
      timestamp: 1,
    };

    await notificationsAgent.broadcast('order.created', item, 's1');

    expect(createEncoderMock).toHaveBeenCalledWith({ contentTopic: '/blue-ocean/orders/s1' });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [encoderArg, { payload }] = sendMock.mock.calls[0];
    expect(encoderArg).toEqual({ contentTopic: '/blue-ocean/orders/s1' });
    const decoded = JSON.parse(Buffer.from(payload).toString());
    expect(decoded).toEqual({ type: 'order.created', notification: item });
  });

  it('generates unique IDs and timestamps under concurrent broadcasts', async () => {
    const makeNotification = (i: number) => ({
      id: `n-${i}`,
      userId: 'u',
      title: 't',
      message: 'm',
      type: 'order' as const,
      read: false,
      timestamp: Date.now() + i,
    });

    const count = 5;
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        notificationsAgent.broadcast('order.created', makeNotification(i), 's1'),
      ),
    );

    const ids = setNotificationMock.mock.calls.map((c) => c[0].id);
    expect(new Set(ids).size).toBe(count);
    const timestamps = setNotificationMock.mock.calls.map((c) => c[0].timestamp);
    expect(new Set(timestamps).size).toBe(count);
  });
});

