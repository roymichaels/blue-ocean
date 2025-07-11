// polyfills.ts (must be the first import)

import 'react-native-url-polyfill/auto';

try {
  require('react-native-get-random-values'); // correct: must use require()
  require('expo-standard-web-crypto'); // correct
} catch (err) {
  console.warn('❌ Polyfill load failed:', err);
}

if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer; // critical fix: use require, not import
}
