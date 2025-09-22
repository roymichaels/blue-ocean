const expoRandomMock = {
  getRandomBytesAsync: jest.fn<Promise<Uint8Array>, [number]>(),
};

jest.mock('expo-random', () => expoRandomMock, { virtual: true });
jest.mock('react-native-get-random-values', () => ({}), { virtual: true });

const STORAGE_KEY = 'waku_ephemeral_key';
const GLOBAL_KEY_SYMBOL = Symbol.for('waku.publisherKey');

const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'navigator'
);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'window'
);
const originalWindowLocalStorageDescriptor =
  typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(window, 'localStorage')
    : undefined;
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage'
);
const originalProcess = global.process;

function bytesSequence(start: number): Uint8Array {
  return Uint8Array.from({ length: 32 }, (_, idx) => (start + idx) & 0xff);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function setReactNativeNavigator(): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { product: 'ReactNative' } as unknown,
  });
}

function stubFailingLocalStorage(): void {
  const thrower = () => {
    throw new Error('localStorage should not be accessed in React Native path');
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: thrower,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: thrower,
    });
  }
}

function clearPublisherKeyGlobal(): void {
  delete (globalThis as Record<PropertyKey, unknown>)[GLOBAL_KEY_SYMBOL];
}

afterEach(() => {
  if (originalNavigatorDescriptor) {
    Object.defineProperty(
      globalThis,
      'navigator',
      originalNavigatorDescriptor as PropertyDescriptor
    );
  } else {
    delete (globalThis as any).navigator;
  }

  if (originalWindowDescriptor) {
    Object.defineProperty(
      globalThis,
      'window',
      originalWindowDescriptor as PropertyDescriptor
    );
  } else {
    delete (globalThis as any).window;
  }

  if (typeof window !== 'undefined') {
    if (originalWindowLocalStorageDescriptor) {
      Object.defineProperty(
        window,
        'localStorage',
        originalWindowLocalStorageDescriptor as PropertyDescriptor
      );
    } else {
      delete (window as any).localStorage;
    }
  }

  if (originalLocalStorageDescriptor) {
    Object.defineProperty(
      globalThis,
      'localStorage',
      originalLocalStorageDescriptor as PropertyDescriptor
    );
  } else {
    delete (globalThis as any).localStorage;
  }

  global.process = originalProcess;
  expoRandomMock.getRandomBytesAsync.mockReset();
  clearPublisherKeyGlobal();
  jest.resetModules();
});

describe('getPublisherKey React Native handling', () => {
  it('persists a generated key via SecureStore without touching localStorage', async () => {
    jest.resetModules();
    clearPublisherKeyGlobal();

    setReactNativeNavigator();
    stubFailingLocalStorage();

    const secureStore = await import('expo-secure-store');
    secureStore.__reset();

    const bytes = bytesSequence(1);
    expoRandomMock.getRandomBytesAsync.mockResolvedValueOnce(bytes);

    const module = await import('@/services/waku');
    const key = await module.getPublisherKey();
    const expected = `hex:${toHex(bytes)}`;

    expect(key).toBe(expected);
    expect(await module.getPublisherKey()).toBe(expected);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(STORAGE_KEY, expected);
    expect(expoRandomMock.getRandomBytesAsync).toHaveBeenCalledTimes(1);
  });

  it('generates a unique key for a new install after SecureStore reset', async () => {
    jest.resetModules();
    clearPublisherKeyGlobal();

    setReactNativeNavigator();
    stubFailingLocalStorage();

    let secureStore = await import('expo-secure-store');
    secureStore.__reset();

    const firstBytes = bytesSequence(11);
    expoRandomMock.getRandomBytesAsync.mockResolvedValueOnce(firstBytes);

    let module = await import('@/services/waku');
    const firstKey = await module.getPublisherKey();
    const expectedFirst = `hex:${toHex(firstBytes)}`;
    expect(firstKey).toBe(expectedFirst);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expectedFirst
    );

    // Simulate reinstall by clearing storage and module cache
    jest.resetModules();
    clearPublisherKeyGlobal();
    secureStore = await import('expo-secure-store');
    secureStore.__reset();

    setReactNativeNavigator();
    stubFailingLocalStorage();

    const secondBytes = bytesSequence(51);
    expoRandomMock.getRandomBytesAsync.mockResolvedValueOnce(secondBytes);

    module = await import('@/services/waku');
    const secondKey = await module.getPublisherKey();
    const expectedSecond = `hex:${toHex(secondBytes)}`;

    expect(secondKey).toBe(expectedSecond);
    expect(secondKey).not.toBe(firstKey);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expectedSecond
    );
  });
});

describe('getPublisherKey fallback behavior', () => {
  it('creates and reuses a random key when no persistent storage exists', async () => {
    jest.resetModules();
    clearPublisherKeyGlobal();

    delete (globalThis as any).navigator;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    const processClone = Object.create(originalProcess);
    processClone.versions = {} as any;
    (global as any).process = processClone;

    expoRandomMock.getRandomBytesAsync.mockRejectedValue(
      new Error('expo random should not be used')
    );

    const fallbackBytes = bytesSequence(101);

    jest.doMock('@noble/hashes/utils', () => ({
      randomBytes: () => fallbackBytes,
    }));
    jest.doMock('crypto', () => {
      throw new Error('crypto unavailable');
    });

    const module = await import('@/services/waku');
    const key = await module.getPublisherKey();
    const expected = `hex:${toHex(fallbackBytes)}`;

    expect(key).toBe(expected);
    expect(await module.getPublisherKey()).toBe(expected);
    expect(key).not.toBe(`hex:${'0'.repeat(64)}`);

    jest.dontMock('@noble/hashes/utils');
    jest.dontMock('crypto');
  });
});
