import { debugLog } from './utils/logger';
import 'react-native-url-polyfill/auto';
import { sha512 } from '@noble/hashes/sha512';
import { etc as edUtils } from '@noble/ed25519';

try {
  // MUST be require() on native
  require('react-native-get-random-values');
  // web-crypto polyfill for RN only
  require('expo-standard-web-crypto');
} catch (err) {
  debugLog('❌ Native polyfills load failed:', err);
}

// Noble needs sync sha512
if (!edUtils.sha512Sync) edUtils.sha512Sync = sha512;

// Node-ish globals
if (typeof global.Buffer === 'undefined') {
  // require, not import
  global.Buffer = require('buffer').Buffer;
}
if (typeof global.process === 'undefined') {
  global.process = require('process');
}

// Ensure tslib has a default export for libs that expect it
try {
  const tslib = require('tslib/modules/index.js');
  if (tslib && !('default' in tslib)) {
    // @ts-ignore
    tslib.default = tslib;
  }
} catch (err) {
  debugLog('❌ tslib polyfill failed (native):', err);
}
