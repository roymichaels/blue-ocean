jest.mock('@/services/waku', () => ({
  publish: jest.fn().mockResolvedValue('id'),
  isWakuDisabled: jest.fn().mockReturnValue(false),
}));

jest.mock('@/utils/wakuSigning', () => ({
  makeSignedWakuMessage: jest
    .fn()
    .mockImplementation(async (type: string, payload: any, role: string) => ({
      type,
      payload,
      sender: { publicKey: 'mock-pub', role },
      signature: 'deadbeef',
    })),
}));

const backlogCallbacks: Array<(code: string) => void> = [];
const drainedCallbacks: Array<() => void> = [];

jest.mock('@/utils/wakuStore', () => ({
  onBacklog: jest.fn((cb: (code: string) => void) => backlogCallbacks.push(cb)),
  onDrained: jest.fn((cb: () => void) => drainedCallbacks.push(cb)),
  E_BACKLOG: 'E_BACKLOG',
  __backlogCallbacks: backlogCallbacks,
  __drainedCallbacks: drainedCallbacks,
}));

jest.mock('@/config/featureFlags', () => ({
  isDeliveryNotificationsEnabled: jest.fn(() => true),
}));

jest.mock('@/services/localIdentity', () => ({
  getPrivateKey: jest.fn(async () => new Uint8Array(32).fill(1)),
  getPublicKeyHex: jest.fn(async () => '11'.repeat(32)),
}));

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
}));

if (typeof (globalThis as any).setImmediate !== 'function') {
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args);
}

const deliveryAgent = require('../../agents/delivery-agent').default;
const { publish } = require('@/services/waku');
const featureFlags = require('@/config/featureFlags');
const { E_BACKLOG } = require('../../agents/delivery-agent');

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('deliveryAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    publish.mockResolvedValue('id');
    featureFlags.isDeliveryNotificationsEnabled.mockReturnValue(true);
    (deliveryAgent as any).backlog = [];
    (deliveryAgent as any).draining = false;
    (deliveryAgent as any).pauseReasons = new Set();
    (deliveryAgent as any).backlogLimit = 100;
  });

  it('broadcasts delivery assignments over Waku', async () => {
    await deliveryAgent.handleDeliveryEvent('delivery.assigned', {
      jobId: 'job1',
      orderId: 'order1',
      driverId: 'driver1',
      status: 'in_progress',
      storeId: 's1',
    });
    await flushMicrotasks();
    await flushMicrotasks();
    expect(featureFlags.isDeliveryNotificationsEnabled).toHaveBeenCalledWith('s1');
    expect((deliveryAgent as any).backlog.length).toBe(0);
    expect(require('@/services/waku').publish).toBe(publish);
    expect(require('@/utils/logger').errorLog).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith(
      '/blue-ocean/delivery/s1',
      expect.objectContaining({
        type: 'notify.deliveryUpdate',
        payload: expect.objectContaining({
          event: 'delivery.assigned',
          jobId: 'job1',
          driverId: 'driver1',
          status: 'in_progress',
          storeId: 's1',
        }),
      }),
    );
  });

  it('broadcasts pending update on order creation', async () => {
    await deliveryAgent.handleOrderEvent('order.created', {
      orderId: 'order-new',
      storeId: 'tenant',
    });
    await flushMicrotasks();
    await flushMicrotasks();
    expect(publish).toHaveBeenCalledWith(
      '/blue-ocean/delivery/tenant',
      expect.objectContaining({
        payload: expect.objectContaining({
          event: 'order.created',
          orderId: 'order-new',
          status: 'pending',
        }),
      }),
    );
    expect(featureFlags.isDeliveryNotificationsEnabled).toHaveBeenCalledWith('tenant');
    expect((deliveryAgent as any).backlog.length).toBe(0);
    expect(require('@/utils/logger').errorLog).not.toHaveBeenCalled();
  });

  it('throws E_BACKLOG when queue is full', async () => {
    (deliveryAgent as any).backlogLimit = 1;
    let resolvePublish: ((value: string) => void) | undefined;
    publish.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolvePublish = resolve;
        }),
    );
    await deliveryAgent.handleDeliveryEvent('delivery.assigned', {
      jobId: 'job1',
      orderId: 'order1',
      driverId: 'driver1',
      status: 'pending',
      storeId: 's1',
    });
    await expect(
      deliveryAgent.handleDeliveryEvent('delivery.assigned', {
        jobId: 'job2',
        orderId: 'order2',
        driverId: 'driver2',
        status: 'pending',
        storeId: 's1',
      }),
    ).rejects.toMatchObject({ code: E_BACKLOG });
    resolvePublish?.('ok');
    await flushMicrotasks();
  });

  it('pauses on Waku store backlog and resumes on drain', async () => {
    expect(deliveryAgent.isPaused()).toBe(false);
    backlogCallbacks.forEach((cb) => cb('E_BACKLOG'));
    expect(deliveryAgent.isPaused()).toBe(true);
    drainedCallbacks.forEach((cb) => cb());
    await flushMicrotasks();
    expect(deliveryAgent.isPaused()).toBe(false);
  });

  it('skips broadcasting when feature flag is disabled', async () => {
    featureFlags.isDeliveryNotificationsEnabled.mockReturnValue(false);
    await deliveryAgent.handleDeliveryEvent('delivery.assigned', {
      jobId: 'job1',
      orderId: 'order1',
      driverId: 'driver1',
      status: 'pending',
      storeId: 's1',
    });
    await flushMicrotasks();
    expect(publish).not.toHaveBeenCalled();
  });
});
