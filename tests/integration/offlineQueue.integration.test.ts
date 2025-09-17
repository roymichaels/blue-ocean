import { Buffer } from 'buffer';

jest.mock('@noble/hashes/blake2b', () => ({
  blake2b: (input: Uint8Array, opts?: { dkLen?: number }) => {
    const length = opts?.dkLen ?? input.length;
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      out[i] = input[i % input.length] ^ 0xaa;
    }
    return out;
  },
}));

jest.mock('@noble/hashes/utils', () => {
  let invocation = 0;
  const sequences: Uint8Array[] = [];

  const deterministic: ((len: number) => Uint8Array) & { __rewind?: () => void } = (
    len: number,
  ): Uint8Array => {
    const existing = sequences[invocation];
    let value: Uint8Array;
    if (existing && existing.length === len) {
      value = existing;
    } else {
      value = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        value[i] = (invocation * 31 + i) % 256;
      }
      sequences[invocation] = value;
    }
    invocation += 1;
    return new Uint8Array(value);
  };

  deterministic.__rewind = () => {
    invocation = 0;
  };

  return { randomBytes: deterministic };
});

jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    EXPO_PUBLIC_WAKU_DISABLE: '1',
    WAKU_DISABLE: '1',
  },
}));

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
  debugLog: jest.fn(),
  warnLog: jest.fn(),
}));

jest.mock('@/utils/transport', () => ({
  getClient: jest.fn(async () =>
    ({
      utf8ToBytes: (value: string) => new TextEncoder().encode(value),
      bytesToUtf8: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
      createEncoder: (options: { contentTopic: string }) => ({ contentTopic: options.contentTopic }),
      createDecoder: (topic: string) => ({ contentTopic: topic }),
    }) as any,
  ),
}));

jest.mock('@/utils/observability', () => require('@/tests/__mocks__/utils/observability'));

const globalAny = globalThis as any;
globalAny.logger = globalAny.logger ?? { info: jest.fn(), error: jest.fn() };

type Factory<T> = () => Promise<T>;

function resetDeterministicRandom(): void {
  const mod = jest.requireMock('@noble/hashes/utils') as {
    randomBytes: ((len: number) => Uint8Array) & { __rewind?: () => void };
  };
  mod.randomBytes.__rewind?.();
}

async function runInIsolated<T>(factory: Factory<T>): Promise<T> {
  resetDeterministicRandom();
  return new Promise<T>((resolve, reject) => {
    jest.isolateModules(() => {
      try {
        factory().then(resolve).catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  });
}

describe('integration/offline queue encryption', () => {
  it('flushes offline payloads and preserves encryption across devices', async () => {
    const {
      topic,
      canonical,
      payload,
      messageId,
    } = await runInIsolated(async () => {
      const { publish } = await import('@/services/waku');
      const wakuStore = await import('@/utils/wakuStore');
      const { canonicalJson } = await import('@/utils/serialization');

      const drainedListener = jest.fn();
      wakuStore.onDrained(drainedListener);
      try {
        const topic = '/blue-ocean/testnet/orders';
        const message = {
          id: 'order-1',
          type: 'order.created',
          payload: { status: 'pending', total: 4200 },
        };

        const messageId = await publish(topic, message);
        const queued = wakuStore.snapshot();
        expect(queued).toHaveLength(1);
        expect(queued[0]?.topic).toBe(topic);

        const canonical = canonicalJson({ ...message, id: messageId });
        const canonicalBytes = new TextEncoder().encode(canonical);
        expect(Buffer.from(queued[0]!.payload).equals(Buffer.from(canonicalBytes))).toBe(false);

        let flushed: Uint8Array | null = null;
        await wakuStore.flush(async (flushTopic, payload) => {
          expect(flushTopic).toBe(topic);
          flushed = payload;
        });

        expect(flushed).toBeDefined();
        expect(wakuStore.snapshot()).toHaveLength(0);
        expect(drainedListener).toHaveBeenCalledTimes(1);

        return { topic, canonical, payload: flushed!, messageId };
      } finally {
        wakuStore.offDrained(drainedListener);
      }
    });

    const decoded = await runInIsolated(async () => {
      const { decrypt } = await import('@/utils/wakuCrypto');
      const { plaintext } = await decrypt(topic, payload);
      return new TextDecoder().decode(plaintext);
    });

    expect(decoded).toBe(canonical);
    expect(messageId).toBe('order-1');
  });
});
