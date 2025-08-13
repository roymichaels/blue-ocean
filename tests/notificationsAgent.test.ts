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

const agentModule = require('../agents/notifications-agent');
const notificationsAgent = agentModule.default;
const { notificationTemplates } = agentModule;

describe('notificationsAgent.broadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationsAgent as any).node = null;
  });

  const events = Object.keys(notificationTemplates) as Array<keyof typeof notificationTemplates>;

  test.each(events)('encodes %s with correct topic and payload', async (event) => {
    const item = {
      id: 'id1',
      userId: 'u1',
      title: 't',
      message: 'm',
      type: 'order',
      read: false,
      timestamp: 1,
    };

    await notificationsAgent.broadcast(event, item);

    const template = notificationTemplates[event](item);
    expect(createEncoderMock).toHaveBeenCalledWith({ contentTopic: template.contentTopic });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [encoderArg, { payload }] = sendMock.mock.calls[0];
    expect(encoderArg).toEqual({ contentTopic: template.contentTopic });
    const decoded = JSON.parse(Buffer.from(payload).toString());
    expect(decoded).toEqual(template.payload);
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
      Array.from({ length: count }, (_, i) => notificationsAgent.broadcast('order.created', makeNotification(i))),
    );

    const ids = setNotificationMock.mock.calls.map((c) => c[0].id);
    expect(new Set(ids).size).toBe(count);
    const timestamps = setNotificationMock.mock.calls.map((c) => c[0].timestamp);
    expect(new Set(timestamps).size).toBe(count);
  });
});

