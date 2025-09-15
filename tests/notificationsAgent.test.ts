jest.mock('../utils/ensureNearWallet', () => jest.fn().mockResolvedValue(undefined));

const setNotificationMock = jest.fn();
jest.mock('@/services/nearNotifications', () => ({
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

jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => ({
    createLightNode: createLightNodeMock as any,
    waitForRemotePeer: jest.fn().mockResolvedValue(undefined),
    createEncoder: createEncoderMock as any,
    Protocols: { Relay: 'relay' },
    utf8ToBytes: utf8ToBytesMock as any,
  })),
}));

const agentModule = require('../agents/notifications-agent');
const notificationsAgent = agentModule.default;
const { E_BACKLOG } = agentModule;

describe('notificationsAgent order pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationsAgent as any).node = null;
    (notificationsAgent as any).backlog = [];
    (notificationsAgent as any).draining = false;
    (notificationsAgent as any).backlogLimit = 50;
    (notificationsAgent as any).pauseReasons = new Set();
    (notificationsAgent as any).latencyTimer = null;
  });

  it('broadcasts notify.orderCreated with i18n key', async () => {
    notificationsAgent.handleOrderEvent('order.created', {
      orderId: 'o1',
      userId: 'u1',
      storeId: 's1',
    });
    await new Promise((r) => setImmediate(r));
    expect(createEncoderMock).toHaveBeenCalledTimes(1);
    expect(createEncoderMock).toHaveBeenCalledWith({
      contentTopic: '/blue-ocean/notifications/1',
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [encoderNotif, { payload: notifPayload }] = sendMock.mock.calls[0];
    expect(encoderNotif).toEqual({ contentTopic: '/blue-ocean/notifications/1' });
    const envelope = JSON.parse(Buffer.from(notifPayload).toString());
    expect(envelope.type).toBe('notification.broadcast');
    const decoded = JSON.parse(envelope.payload);
    expect(decoded.type).toBe('notify.orderCreated');
    expect(decoded.storeId).toBe('s1');
    expect(decoded.notification.title).toBe('notify.orderCreated');
  });

  it('surfaces E_BACKLOG when queue exceeds limit', async () => {
    (notificationsAgent as any).backlogLimit = 1;
    notificationsAgent.handleOrderEvent('order.created', { orderId: 'o1', userId: 'u1' });
    expect(() =>
      notificationsAgent.handleOrderEvent('order.created', {
        orderId: 'o2',
        userId: 'u1',
      }),
    ).toThrowError(expect.objectContaining({ code: E_BACKLOG }));
    expect((notificationsAgent as any).pauseReasons.has('queue')).toBe(true);
    await new Promise((r) => setImmediate(r));
    expect(notificationsAgent.isPaused()).toBe(false);
  });

  it('auto-pauses on high latency', async () => {
    jest.useFakeTimers();
    (notificationsAgent as any).latencyLimit = 5;
    notificationsAgent.handleOrderEvent('order.created', { orderId: 'o1', userId: 'u1' });
    await new Promise((r) => setImmediate(r));
    expect(notificationsAgent.isPaused()).toBe(true);
    jest.advanceTimersByTime(5);
    await Promise.resolve();
    expect(notificationsAgent.isPaused()).toBe(false);
    jest.useRealTimers();
  });

  it('falls back to polling when paused', async () => {
    jest.useFakeTimers();
    (notificationsAgent as any).latencyLimit = 1000;
    (notificationsAgent as any).pollInterval = 10;
    const sub = jest.fn();
    notificationsAgent.subscribe(sub);
    notificationsAgent.handleOrderEvent('order.created', { orderId: 'o1', userId: 'u1' });
    await new Promise((r) => setImmediate(r));
    expect(notificationsAgent.isPaused()).toBe(true);
    const polled = {
      id: 'p1',
      userId: 'u1',
      title: 't',
      message: 'm',
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    const list = require('@/services/nearNotifications').listNotifications as jest.Mock;
    list.mockResolvedValueOnce([polled]);
    jest.advanceTimersByTime(10);
    await Promise.resolve();
    expect(sub).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    notificationsAgent.unsubscribe(sub);
    jest.useRealTimers();
  });
});
