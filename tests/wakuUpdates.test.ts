import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';

jest.mock('../lib/waku/wakuCrypto', () => ({
  encryptWakuPayload: jest.fn(async (p: string) => p),
}));

const start = jest.fn();
const stop = jest.fn();
const node = {
  start,
  stop,
  createEncoder: jest.fn(() => ({})),
  lightPush: { send: jest.fn() },
};

jest.mock(
  '@waku/sdk',
  () => ({
    createLightNode: jest.fn(async () => node),
    waitForRemotePeer: jest.fn(async () => undefined),
    Protocols: { LightPush: 'lightpush' },
  }),
  { virtual: true }
);

jest.mock('@noble/ed25519', () => ({
  sign: jest.fn(),
  etc: { hexToBytes: jest.fn(), bytesToHex: jest.fn() },
}));

describe('Waku send updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('user update creates and stops node', async () => {
    await sendWakuUserUpdate({});
    const { createLightNode } = await import('@waku/sdk');
    expect(createLightNode).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it('product update creates and stops node', async () => {
    await sendWakuProductUpdate({});
    const { createLightNode } = await import('@waku/sdk');
    expect(createLightNode).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it('order update creates and stops node', async () => {
    await sendWakuOrderUpdate({});
    const { createLightNode } = await import('@waku/sdk');
    expect(createLightNode).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });
});
