import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import { sendWakuNotificationUpdate } from '../lib/waku/sendWakuNotificationUpdate';
import { sendWakuStoreUpdate } from '../lib/waku/sendWakuStoreUpdate';

jest.mock('../lib/waku/wakuCrypto', () => ({
  encryptWakuPayload: jest.fn(async (p: string) => p),
}));
const node = {
  createEncoder: jest.fn(() => ({})),
  lightPush: { send: jest.fn() },
};

jest.mock('../lib/waku/nodeSingleton', () => ({
  getNode: jest.fn(async () => node),
  stopNode: jest.fn(),
}));


describe('Waku send updates', () => {
  const { getNode } = require('../lib/waku/nodeSingleton');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('user update uses shared node', async () => {
    await sendWakuUserUpdate({});
    expect(getNode).toHaveBeenCalled();
    expect(node.lightPush.send).toHaveBeenCalled();
  });

  it('product update uses shared node', async () => {
    await sendWakuProductUpdate({});
    expect(getNode).toHaveBeenCalled();
    expect(node.lightPush.send).toHaveBeenCalled();
  });

  it('omits sender and signature when disabled', async () => {
    await sendWakuProductUpdate({}, false);
    const payload = node.lightPush.send.mock.calls[0][1].payload;
    const decoded = new TextDecoder().decode(payload);
    const parsed = JSON.parse(decoded);
    expect(parsed.sender).toBeUndefined();
    expect(parsed.signature).toBeUndefined();
  });

  it('order update uses shared node', async () => {
    await sendWakuOrderUpdate({});
    expect(getNode).toHaveBeenCalled();
    expect(node.lightPush.send).toHaveBeenCalled();
  });

  it('notification update uses shared node', async () => {
    await sendWakuNotificationUpdate({});
    expect(getNode).toHaveBeenCalled();
    expect(node.lightPush.send).toHaveBeenCalled();
  });

  it('store update uses shared node', async () => {
    await sendWakuStoreUpdate({});
    expect(getNode).toHaveBeenCalled();
    expect(node.lightPush.send).toHaveBeenCalled();
  });
});
