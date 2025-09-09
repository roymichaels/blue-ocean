jest.mock('@/config', () => ({ default: { EXPO_PUBLIC_WAKU_DISABLE: '1' } }));
jest.mock('@/utils/logger', () => ({ errorLog: jest.fn() }));
jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => ({
    utf8ToBytes: (s: string) => new TextEncoder().encode(s),
    bytesToUtf8: (b: Uint8Array) => new TextDecoder().decode(b),
    createEncoder: () => ({}),
    createDecoder: () => ({}),
  })),
}));

;(global as any).logger = { info: jest.fn(), error: jest.fn() };
(global as any).serviceLatency = { startTimer: () => () => {} };
(global as any).serviceFailures = { inc: jest.fn() };
import { publish } from '@/services/waku';
import { snapshot, flush } from '@/utils/wakuStore';

describe('waku offline replay', () => {
  it('queues messages when offline and flushes on reconnect', async () => {
    await publish('/test', { hello: 'world' });
    expect(snapshot()).toHaveLength(1);
    const send = jest.fn(async (_t: string, _p: Uint8Array) => {});
    await flush(send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(snapshot()).toHaveLength(0);
  });
});
