// src/polyfills.ts (or wherever you import it)

import 'react-native-url-polyfill/auto';

try {
  if (typeof global.Buffer === 'undefined') {
    global.Buffer = require('buffer').Buffer;
  }
} catch (err) {
  console.error('Failed to polyfill Buffer:', err);
}

try {
  require('expo-standard-web-crypto'); // Don't import! Use require.
  console.log('✅ Web Crypto loaded');
} catch (err) {
  console.error('❌ Failed to load expo-standard-web-crypto:', err);
}

try {
  require('react-native-get-random-values');
  console.log('✅ Random values loaded');
} catch (err) {
  console.error('❌ Failed to load random values:', err);
}
