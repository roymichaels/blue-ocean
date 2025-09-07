import { Buffer } from 'buffer';

const queryGenerator = jest.fn(() => {
  return (async function* () {
    const payload1 = Buffer.from(JSON.stringify({ itemId: 1, seller: 'alice', priceYocto: '5' }));
    const payload2 = Buffer.from(JSON.stringify({ itemId: 2, seller: 'bob', priceYocto: '7' }));
    yield { messages: [{ payload: payload1 }, { payload: payload2 }] } as any;
  })();
});

jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => ({
    createLightNode: jest.fn(async () => ({
      start: jest.fn(),
      store: { queryGenerator },
    })),
    waitForRemotePeer: jest.fn(),
    Protocols: { Store: 'store' },
    createDecoder: jest.fn(() => ({})),
  })),
}));

import { hydrateMessages } from '../packages/sdk-near/src/waku';

const TOPIC = '/blueocean/testnet/test/listings';

describe('hydrate_messages', () => {
  it('populates_cache_without_duplicates', async () => {
    const first = await hydrateMessages(TOPIC);
    expect(first).toHaveLength(2);
    const second = await hydrateMessages(TOPIC);
    expect(second).toHaveLength(2);
    expect(queryGenerator).toHaveBeenCalledTimes(2);
  });
});
