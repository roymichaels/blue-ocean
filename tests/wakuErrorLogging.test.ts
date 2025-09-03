jest.mock(
  '@waku/sdk',
  () => ({
    createLightNode: jest.fn(async () => {
      throw new Error('boom');
    }),
    waitForRemotePeer: jest.fn(),
    Protocols: { Relay: 'relay' },
  }),
  { virtual: true },
);

jest.mock('@/utils/logger', () => ({ errorLog: jest.fn() }));

import { ensureNode } from '../services/waku';
import { errorLog } from '@/utils/logger';

describe('ensureNode error logging', () => {
  it('logs a descriptive error when startup fails', async () => {
    await expect(ensureNode()).resolves.toBeNull();
    expect(errorLog).toHaveBeenNthCalledWith(1, 'Failed to start Waku node', 'boom');
    expect(errorLog).toHaveBeenNthCalledWith(2, expect.stringContaining('Error: boom'));
  });
});
