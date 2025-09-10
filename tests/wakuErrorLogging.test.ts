const createLightNode = jest.fn(async () => {
  throw new Error('boom');
});
jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () => ({
    createLightNode,
    waitForRemotePeer: jest.fn(),
    Protocols: { Relay: 'relay' },
  })),
}));

jest.mock('@/utils/logger', () => ({ errorLog: jest.fn() }));
jest.mock('@/utils/observability', () => require('@/tests/__mocks__/utils/observability'));

;(global as any).logger = { info: jest.fn(), error: jest.fn() };
import { ensureNode } from '@/services/waku';
import { errorLog } from '@/utils/logger';

describe('ensureNode error logging', () => {
  it('logs a descriptive error when startup fails', async () => {
    await expect(ensureNode()).resolves.toBeNull();
    expect(errorLog).toHaveBeenNthCalledWith(1, 'Failed to start Waku node', 'boom');
    expect(errorLog).toHaveBeenNthCalledWith(2, expect.stringContaining('Error: boom'));
  });
});
