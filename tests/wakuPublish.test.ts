jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => ({
    utf8ToBytes: (s: string) => Buffer.from(s),
    createEncoder: jest.fn(),
  })),
}));

import { publish } from '@/services/waku';
import * as waku from '@/services/waku';

describe('publish constraints', () => {
  it('rejects payloads exceeding 200KB gz', async () => {
    const big = { data: 'a'.repeat(210 * 1024) };
    await expect(publish('/topic', big)).rejects.toThrow(
      'Payload exceeds 200KB',
    );
  });

  it('queues when send exceeds TTI', async () => {
    jest.useFakeTimers();
    const sendHang = jest.fn(() => new Promise(() => {}));
    jest.spyOn(waku, 'ensureNode').mockResolvedValue({
      lightPush: { send: sendHang },
    } as any);
    const enqueueSpy = jest.spyOn(require('@/utils/wakuStore'), 'enqueue');
    const p = publish('/topic', { a: 1 });
    jest.advanceTimersByTime(3000);
    await p;
    expect(enqueueSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
