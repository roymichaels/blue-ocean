import { Buffer } from 'buffer';

const mockQueryGenerator = jest.fn(() => {
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
      store: { queryGenerator: mockQueryGenerator },
    })),
    waitForRemotePeer: jest.fn(),
    Protocols: { Store: 'store' },
    createDecoder: jest.fn(() => ({})),
  })),
}));

import { hydrateMessages } from '@/vendor/blue-ocean-sdk-near/waku';
import { STUB_MESSAGE } from '@/services/nearStub';

const TOPIC = '/blueocean/testnet/test/listings';

  describe('hydrate_messages', () => {
    it('throws while NEAR integration is stubbed out', async () => {
      await expect(hydrateMessages(TOPIC)).rejects.toThrow(STUB_MESSAGE);
      expect(mockQueryGenerator).not.toHaveBeenCalled();
    });
  });
