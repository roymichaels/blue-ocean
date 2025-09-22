const debugLog = (...messages: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[polyfill]', ...messages);
  }
};
// Ensure Expo Modules web shims are loaded so globalThis.expo is defined
try {
  // Side-effect import to setup globalThis.expo (SharedObject, etc.)
  require('expo-modules-core');
} catch {}
// Minimal fallback if the shim didn't set it for some reason
try {
  const g: any = globalThis as any;
  if (!g.expo) g.expo = {};
  if (!g.expo.SharedObject) {
    g.expo.SharedObject = class {};
  }
} catch {}
import { sha512 } from '@noble/hashes/sha512';
import { etc as edUtils } from '@noble/ed25519';

// On web, URL is natively supported; skip react-native-url-polyfill.
// On web, browser already has crypto.subtle. Do NOT import expo-standard-web-crypto here.
// Noble needs sync sha512
if (!edUtils.sha512Sync) edUtils.sha512Sync = sha512;

// Optional: only add Buffer/process if you need them on web
try {
  if (typeof (globalThis as any).Buffer === 'undefined') {
    (globalThis as any).Buffer = require('buffer').Buffer;
  }
  if (typeof (globalThis as any).process === 'undefined') {
    (globalThis as any).process = require('process');
  }
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
try {
  // Prefer the standard entry; webpack alias maps modules/index.js to a CJS shim
  const tslib = require('tslib');
  if (tslib && !('default' in tslib)) {
    // @ts-ignore
    tslib.default = tslib;
  }
} catch {
  // Quietly ignore; modern builds usually don't require this
}
