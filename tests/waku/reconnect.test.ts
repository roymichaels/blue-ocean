jest.mock('@/config', () => ({ default: {} }));
jest.mock('@/utils/logger', () => ({ errorLog: jest.fn() }));

const mockClient = {
  waitForRemotePeer: jest.fn(async () => {}),
  Protocols: { Relay: 'relay', Store: 'store' },
  utf8ToBytes: (s: string) => new TextEncoder().encode(s),
  bytesToUtf8: (b: Uint8Array) => new TextDecoder().decode(b),
  createEncoder: () => ({}),
  createDecoder: () => ({}),
};

jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => mockClient),
}));
jest.mock('@/utils/observability', () => require('@/tests/__mocks__/utils/observability'));

(global as any).logger = { info: jest.fn(), error: jest.fn() };
import { ensureNode } from '@/services/waku';
import { getClient } from '@/utils/transport';

function createFakeNode() {
  const libp2p = new EventTarget();
  return {
    start: jest.fn(),
    libp2p,
    lightPush: { send: jest.fn() },
    relay: { addObserver: jest.fn(), deleteObserver: jest.fn() },
    store: { queryHistory: jest.fn().mockResolvedValue({ messages: [], next: null }) },
  } as any;
}

describe('waku auto reconnect', () => {
  it('retries connection with exponential backoff', async () => {
    jest.useFakeTimers();
    const node1 = createFakeNode();
    const node2 = createFakeNode();
    const createLightNode = jest
      .fn()
      .mockResolvedValueOnce(node1)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(node2);
    (getClient as jest.Mock).mockResolvedValueOnce({ ...mockClient, createLightNode })
      .mockResolvedValue({ ...mockClient, createLightNode });
    await ensureNode();
    expect(createLightNode).toHaveBeenCalledTimes(1);
    node1.libp2p.dispatchEvent(new Event('peer:disconnect'));
    await jest.advanceTimersByTimeAsync(1000);
    expect(createLightNode).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(2000);
    expect(createLightNode).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });
});
