import 'dotenv/config';
import { jest } from '@jest/globals';
import React from 'react';
import { insertConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';

// Make this file a module so global augmentation works
export {};

// Ensure global React for classic JSX runtime in tests
(globalThis as any).React = React;

const secretInternals =
  (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ??
  (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  (React as any).__COMPILER_RUNTIME?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
if (!(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED && secretInternals) {
  (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = secretInternals;
}
if (!(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = { ReactCurrentOwner: {} };
}

(globalThis as any).IS_REACT_ACT_ENVIRONMENT =
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT ?? true;

try {
  const renderer = require('react-test-renderer');
  if (renderer && typeof renderer.create === 'function' && typeof renderer.act === 'function') {
    const originalCreate = renderer.create.bind(renderer);
    renderer.create = (...args: any[]) => {
      let created: any;
      renderer.act(() => {
        created = originalCreate(...args);
      });
      return created;
    };
  }
} catch {
  // ignore missing renderer in non-React tests
}


/** ---------------- Reanimated bootstrap (v3/v4 safe) ---------------- */
try {
  // Reanimated v4+
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setUpTests } = require('react-native-reanimated/jestUtils');
  setUpTests?.();
} catch {
  try {
    // Reanimated v2/v3
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      setUpTests,
    } = require('react-native-reanimated/src/reanimated2/jestUtils');
    setUpTests?.();
  } catch {
    // no-op if neither exists
  }
}

// ---------------- Declare only what RN doesn't already declare
declare global {
  // Reanimated injects this at runtime; we stub for tests
  // eslint-disable-next-line no-var
  var __reanimatedWorkletInit: () => void;
}

// Provide stubs in test env
(globalThis as any).__reanimatedWorkletInit = () => {};
// RN already declares const __DEV__: boolean; don't redeclare—just set if missing.
if (typeof (globalThis as any).__DEV__ === 'undefined') {
  (globalThis as any).__DEV__ = false;
}

// Keep mocks AFTER reanimated bootstrap
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);
jest.mock('expo-secure-store');
jest.mock('@/services/nearKvStore', () => require('./nearKvMock'));
jest.mock('@/services/nearSettings');

/** ---------------- App config for tests ---------------- */
insertConfig({
  NEAR_RPC_URL: 'https://near.test',
  EXPO_PUBLIC_CHAIN: 'near',
  EXPO_PUBLIC_CONTRACT_ID: 'EQtestcontract',
  EXPO_PUBLIC_NETWORK: 'testnet',
});

beforeEach(async () => {
  insertConfig({
    NEAR_RPC_URL: 'https://near.test',
    EXPO_PUBLIC_CHAIN: 'near',
    EXPO_PUBLIC_CONTRACT_ID: 'EQtestcontract',
    EXPO_PUBLIC_NETWORK: 'testnet',
  });

  await loadTenantSettings();
});
