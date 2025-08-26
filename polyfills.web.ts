import { debugLog } from './utils/logger';
import 'react-native-url-polyfill/auto';
import { sha512 } from '@noble/hashes/sha512';
import { etc as edUtils } from '@noble/ed25519';

// On web, browser already has crypto.subtle. Do NOT import expo-standard-web-crypto here.
// Noble needs sync sha512
if (!edUtils.sha512Sync) edUtils.sha512Sync = sha512;

// Optional: only add Buffer/process if you need them on web
try {
  if (typeof (globalThis as any).Buffer === 'undefined') {
    (globalThis as any).Buffer = require('buffer').Buffer;
  }
  if (typeof (globalThis as any).process === 'undefined') {
    (globalThis as any).process = require('process/browser');
  }
} catch (err) {
  debugLog('ℹ️ web Buffer/process polyfill skipped:', err);
}

// Keep the tslib shim to be safe on web too
try {
  const tslib = require('tslib/modules/index.js');
  if (tslib && !('default' in tslib)) {
    // @ts-ignore
    tslib.default = tslib;
  }
} catch (err) {
  debugLog('❌ tslib polyfill failed (web):', err);
}
