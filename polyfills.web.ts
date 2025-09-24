import {
  ensureEd25519SyncHash,
  ensureNodeLikeGlobals,
  ensureTslibDefault,
  type GlobalLike,
} from './polyfills/shared';
import { debugLog } from './utils/logger';

// Ensure Expo Modules web shims are loaded so globalThis.expo is defined
try {
  // Side-effect import to setup globalThis.expo (SharedObject, etc.)
  require('expo-modules-core');
} catch {}
// Minimal fallback if the shim didn't set it for some reason
try {
  const g = globalThis as GlobalLike & { expo?: Record<string, unknown> };
  if (!g.expo) g.expo = {};
  if (!g.expo.SharedObject) {
    g.expo.SharedObject = class {};
  }
} catch {}

// On web, URL is natively supported; skip react-native-url-polyfill.
// On web, browser already has crypto.subtle. Do NOT import expo-standard-web-crypto here.
ensureEd25519SyncHash();

// Optional: only add Buffer/process if you need them on web
try {
  ensureNodeLikeGlobals(globalThis as unknown as GlobalLike);
  // Some compiled libs (e.g., expo-router build output) may be transformed
  // with the classic JSX runtime and expect a global React identifier.
  // Ensure React is available as a global on web to avoid ReferenceError.
  if (typeof (globalThis as any).React === 'undefined') {
    (globalThis as any).React = require('react');
  }
  // Guard util.promisify to avoid crashes when polyfilled modules are missing
  const util = require('util');
  const originalPromisify = util.promisify;
  util.promisify = (fn: any) => {
    if (typeof fn !== 'function') {
      return async () =>
        Promise.reject(new TypeError('The "original" argument must be of type Function'));
    }
    return originalPromisify(fn);
  };
} catch (err) {
  debugLog('ℹ️ web Buffer/process polyfill skipped:', err);
}

// Keep the tslib shim to be safe on web too
ensureTslibDefault('tslib');
ensureTslibDefault('tslib/modules/index.js');
