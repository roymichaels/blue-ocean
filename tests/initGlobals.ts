// Setup global variables required by React Native modules
// eslint-disable-next-line
(globalThis as any).__DEV__ = true;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
process.env.EXPO_PUBLIC_CHAIN = 'near';
process.env.EXPO_PUBLIC_CONTRACT_ID = 'EQtestcontract';
process.env.EXPO_PUBLIC_NETWORK = 'testnet';
if (!process.env.CACHE_SECRET) {
  process.env.CACHE_SECRET = 'test-cache-secret';
}

// Provide minimal polyfills for Node environments lacking Web APIs.
// `fetch` is undefined in older Node versions which makes `jest.spyOn`
// fail before tests even run. A stub allows tests to replace it with
// their own mock implementation.
if (!(globalThis as any).fetch) {
  (globalThis as any).fetch = async () => {
    throw new Error('fetch is not implemented in this test environment');
  };
}

// TextEncoder/TextDecoder are required by some Waku helpers and are
// available in `util` for Node environments. Expose them on the global
// object so tests can construct them without errors.
import * as jestGlobals from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import { createRequire } from 'module';

const baseRequire = createRequire(`${process.cwd()}/jest.config.js`);

const configValues = {
  EXPO_PUBLIC_TRANSPORT: '',
  EXPO_PUBLIC_CONTRACT_ID: '',
  WAKU_PUBLISHER_KEY: '',
  EXPO_PUBLIC_WAKU_PUBLISHER_KEY: '',
  WAKU_DISABLE: '',
  EXPO_PUBLIC_WAKU_DISABLE: '',
  WAKU_STRICT: '',
  EXPO_PUBLIC_RELAYER_URL: '',
  EXPO_PUBLIC_INDEXER_URL: '',
  EXPO_PUBLIC_DEBUG_LOGS: '',
  EXPO_PUBLIC_CHAIN: '',
  NEAR_NETWORK: '',
  NEAR_RPC_URL: '',
  NEAR_RPC_FALLBACK_URLS: '',
  ENABLE_UNSAFE_NEAR_PRIVATE_KEY: '',
  EXPO_PUBLIC_PINATA_API_KEY: '',
  EXPO_PUBLIC_PINATA_SECRET_API_KEY: '',
  EXPO_PUBLIC_PINATA_JWT: '',
  EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY: '',
  NEAR_LAKE_BUCKET: '',
  NEAR_LAKE_REGION: 'eu-central-1',
  NEAR_LAKE_DIR: '',
  NEAR_LAKE_START_BLOCK: '0',
  NEAR_LAKE_ENDPOINT: '',
  NEAR_ACCESS_KEY: '',
  NEAR_SECRET_KEY: '',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  CACHE_DIR: '',
  CACHE_SECRET: '',
};

Object.defineProperty(configValues, 'CACHE_SECRET', {
  configurable: true,
  enumerable: true,
  get() {
    return process.env.CACHE_SECRET ?? 'test-cache-secret';
  },
  set(value) {
    process.env.CACHE_SECRET = value as string;
  },
});

const configStub = {
  default: configValues,
  reloadConfig: () => {},
};

class MinioClientStub {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_opts: any) {}
  listObjectsV2() {
    return {
      async *[Symbol.asyncIterator]() {
        // no objects
      },
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  putObject(_bucket: string, _key: string, _value: string) {
    return Promise.resolve();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeObject(_bucket: string, _key: string) {
    return Promise.resolve();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getObject(_bucket: string, _key: string) {
    return Promise.resolve(undefined);
  }
}

(globalThis as any).require = (id: string) => {
  if (id === '@/config' || id === '../config') {
    return configStub;
  }
  if (id === 'minio') {
    return { Client: MinioClientStub };
  }
  if (id === 'jest') {
    return { jest: jestGlobals.jest };
  }
  if (id === '@jest/globals') {
    return jestGlobals;
  }
  return baseRequire(id);
};
if (!(globalThis as any).TextEncoder) {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (!(globalThis as any).TextDecoder) {
  (globalThis as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
(globalThis as any).jest = jestGlobals.jest;
