import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
}));

jest.mock('@/services/eventBus', () => ({
  __esModule: true,
  default: { track: jest.fn() },
}));

const mockUseAuth = jest.fn();
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const notificationServiceMock = {
  getNotifications: jest.fn().mockResolvedValue([]),
  subscribeToUserNotifications: jest.fn().mockReturnValue('sub'),
  unsubscribeFromNotifications: jest.fn(),
};

jest.mock('@/services/notification', () => ({
  __esModule: true,
  default: {
    getInstance: () => notificationServiceMock,
  },
}));

const verifyBeforeWriteMock = jest.fn();
jest.mock('@/utils/verifyMessageSignature', () => ({
  verifyBeforeWrite: (...args: any[]) => verifyBeforeWriteMock(...args),
}));

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const mockClient = {
  Protocols: { Relay: 'relay', Store: 'store' },
  waitForRemotePeer: jest.fn(),
  createLightNode: jest.fn(),
  createDecoder: jest.fn(() => ({})),
  createEncoder: jest.fn(() => ({})),
  utf8ToBytes: (input: string) => textEncoder.encode(input),
  bytesToUtf8: (input: Uint8Array) => textDecoder.decode(input),
};

jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => mockClient),
}));

import { getClient } from '@/utils/transport';
import { WakuProvider } from '@/contexts/WakuContext';
import { useNotificationSubscription } from '@/features/notifications';

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
}

function TestHarness({ onNotification }: { onNotification: jest.Mock }) {
  const { unreadCount } = useNotificationSubscription((_, __, ___, ____, id) => {
    onNotification(id);
  });
  return React.createElement('Count', { value: unreadCount });
}

describe('Waku notifications resume after delayed connect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isLoggedIn: true, user: { id: 'user-1' } });
  });

  it('delivers queued notification callbacks once the node connects', async () => {
    const waitForPeer = createDeferred<void>();
    const observers = new Set<(msg: any) => void>();
    const addObserver = jest.fn((handler: (msg: any) => void) => {
      observers.add(handler);
      return () => {
        observers.delete(handler);
      };
    });
    const deleteObserver = jest.fn((handler: (msg: any) => void) => {
      observers.delete(handler);
    });

    const node = {
      start: jest.fn(async () => {}),
      stop: jest.fn(async () => {}),
      libp2p: new EventTarget(),
      lightPush: { send: jest.fn() },
      relay: { addObserver, deleteObserver },
      store: { queryGenerator: jest.fn() },
    } as any;

    mockClient.createLightNode.mockResolvedValue(node);
    mockClient.waitForRemotePeer.mockImplementation(async () => waitForPeer.promise);

    const rawMessage = {
      type: 'notify.direct',
      payload: JSON.stringify({
        type: 'notify.direct',
        notification: {
          id: 'notif-1',
          userId: 'user-1',
          title: 'Hello',
          message: 'World',
          type: 'message',
          read: false,
          timestamp: Date.now(),
        },
        ts: Date.now(),
        nonce: 'nonce-1',
      }),
      sender: { publicKey: '0xabc' },
      signature: '0xsig',
      ts: Date.now(),
      nonce: 'nonce-1',
    };

    verifyBeforeWriteMock.mockImplementation(async () => rawMessage as any);

    const onNotification = jest.fn();

    let testRenderer!: ReturnType<typeof renderer.create>;
    await act(async () => {
      testRenderer = renderer.create(
        React.createElement(
          WakuProvider,
          null,
          React.createElement(TestHarness, { onNotification }),
        ),
      );
    });

    expect(addObserver).not.toHaveBeenCalled();

    await act(async () => {
      waitForPeer.resolve();
      await Promise.resolve();
    });

    const getClientMock = getClient as jest.Mock;
    expect(getClientMock).toHaveBeenCalled();

    // Allow the subscription effect to run after connection resolves
    await act(async () => {
      await Promise.resolve();
    });

    expect(addObserver).toHaveBeenCalled();

    const handler = Array.from(observers)[0];
    expect(handler).toBeDefined();

    await act(async () => {
      await handler({
        payload: mockClient.utf8ToBytes(JSON.stringify(rawMessage)),
      });
      await Promise.resolve();
    });

    expect(onNotification).toHaveBeenCalledWith('notif-1');

    await act(async () => {
      await Promise.resolve();
    });

    const countNode = testRenderer!.root.findByType('Count');
    expect(countNode.props.value).toBe(1);

    await act(async () => {
      testRenderer.unmount();
    });
  });
});
