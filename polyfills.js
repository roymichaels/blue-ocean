// polyfills.ts (must be the first import)

import 'react-native-url-polyfill/auto';
import { sha512 } from '@noble/hashes/sha512';
import { utils as edUtils } from '@noble/ed25519';

try {
  require('react-native-get-random-values'); // correct: must use require()
  require('expo-standard-web-crypto'); // correct
} catch (err) {
  console.warn('❌ Polyfill load failed:', err);
}

// Provide synchronous SHA-512 for @noble/ed25519
if (!edUtils.sha512Sync) {
  edUtils.sha512Sync = sha512;
}

if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer; // critical fix: use require, not import
}

if (typeof global.process === 'undefined') {
  global.process = require('process/browser');
}
