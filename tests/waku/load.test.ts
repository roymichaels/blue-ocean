import { enqueue, flush, snapshot } from '@/utils/wakuStore';

const send = jest.fn(async (_topic: string, _payload: Uint8Array) => {
  // no-op
});

describe('waku replay queue load', () => {
  it('flushes high volume of messages', async () => {
    for (let i = 0; i < 500; i++) {
      enqueue('topic', new Uint8Array([i % 255]));
    }
    await flush(send);
    expect(send).toHaveBeenCalledTimes(500);
    expect(snapshot()).toHaveLength(0);
  });
});
