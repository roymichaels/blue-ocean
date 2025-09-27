const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const mockCreateDecoder = jest.fn(() => ({}));
const mockBytesToUtf8 = jest.fn((bytes: Uint8Array) => textDecoder.decode(bytes));
const mockUtf8ToBytes = jest.fn((value: string) => textEncoder.encode(value));
const mockCreateEncoder = jest.fn(() => ({}));

const mockClient = {
  createDecoder: mockCreateDecoder,
  bytesToUtf8: mockBytesToUtf8,
  utf8ToBytes: mockUtf8ToBytes,
  createEncoder: mockCreateEncoder,
};

jest.mock('@/utils/transport', () => ({
  __esModule: true,
  getClient: jest.fn(),
}));

jest.mock('@/utils/wakuCrypto', () => {
  class MockWakuDecryptError extends Error {}
  return {
    __esModule: true,
    decrypt: jest.fn(),
    encrypt: jest.fn(),
    getCurrentKeyEpoch: jest.fn(),
    getSupportedKeyEpochs: jest.fn(),
    WakuDecryptError: MockWakuDecryptError,
  };
});

jest.mock('@/vendor/blue-ocean-utils', () => ({
  __esModule: true,
  topicFor: jest.fn(() => '/mock/topic'),
}));

jest.mock('@/services/monitoring', () => ({
  __esModule: true,
  wakuDecryptErrorCounter: { inc: jest.fn() },
}));

jest.mock('@/utils/serialization', () => ({
  __esModule: true,
  canonicalJson: (value: unknown) => JSON.stringify(value),
}));

describe('subscribeWithAck', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(0);

    mockCreateDecoder.mockImplementation(() => ({}));
    mockBytesToUtf8.mockImplementation((bytes: Uint8Array) => textDecoder.decode(bytes));
    mockUtf8ToBytes.mockImplementation((value: string) => textEncoder.encode(value));
    mockCreateEncoder.mockImplementation(() => ({}));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('suppresses duplicate ids but expires them after the TTL', async () => {
    const transport = await import('@/utils/transport');
    const getClientMock = transport.getClient as jest.Mock;
    getClientMock.mockResolvedValue(mockClient);

    const crypto = await import('@/utils/wakuCrypto');
    const decryptMock = crypto.decrypt as jest.Mock;
    const getSupportedKeyEpochsMock = crypto.getSupportedKeyEpochs as jest.Mock;
    getSupportedKeyEpochsMock.mockReturnValue([0]);

    const messages = [
      { id: 'msg-1', seq: 1 },
      { id: 'msg-1', seq: 2 },
      { id: 'msg-1', seq: 3 },
    ];
    let callIndex = 0;
    decryptMock.mockImplementation(async () => {
      const message = messages[Math.min(callIndex, messages.length - 1)];
      callIndex += 1;
      return { plaintext: mockUtf8ToBytes(JSON.stringify(message)) };
    });

    const callback = jest.fn();
    const unsubscribe = jest.fn();
    let observer: ((msg: any) => Promise<void>) | undefined;

    const mockRelay = {
      addObserver: jest.fn((handler: (msg: any) => Promise<void>) => {
        observer = handler;
        return unsubscribe;
      }),
    };
    const mockLightPush = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    const node = { relay: mockRelay, lightPush: mockLightPush } as const;

    const wakuModule = await import('@/services/waku');
    const ensureNodeSpy = jest.spyOn(wakuModule, 'ensureNode').mockResolvedValue(node as any);

    try {
      await wakuModule.subscribeWithAck('/blue-ocean/test', callback);
      expect(mockRelay.addObserver).toHaveBeenCalledTimes(1);
      expect(observer).toBeDefined();

      await observer!({ payload: mockUtf8ToBytes('first') });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ seq: 1 }));
      expect(mockLightPush.send).toHaveBeenCalledTimes(1);

      await observer!({ payload: mockUtf8ToBytes('second') });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockLightPush.send).toHaveBeenCalledTimes(1);

      jest.setSystemTime(wakuModule.RECEIVED_ID_TTL_MS + 1);

      await observer!({ payload: mockUtf8ToBytes('third') });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ seq: 3 }));
      expect(mockLightPush.send).toHaveBeenCalledTimes(2);
    } finally {
      ensureNodeSpy.mockRestore();
    }
  });
});
