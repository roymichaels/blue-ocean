// Setup global variables required by React Native modules
// eslint-disable-next-line
(globalThis as any).__DEV__ = true;
process.env.EXPO_PUBLIC_CHAIN = 'near';
process.env.EXPO_PUBLIC_CONTRACT_ID = 'EQtestcontract';
process.env.EXPO_PUBLIC_NETWORK = 'testnet';

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
import { TextEncoder, TextDecoder } from 'util';
if (!(globalThis as any).TextEncoder) {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (!(globalThis as any).TextDecoder) {
  (globalThis as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
