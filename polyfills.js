// src/polyfills.ts

// MUST be imported before any crypto usage
import 'react-native-get-random-values'; // Patch Math.random + UUID for React Native
import 'expo-standard-web-crypto'; // Web-compatible crypto shim
import 'react-native-url-polyfill/auto'; // Fixes URL, URLSearchParams in RN

import { Buffer } from 'buffer';

// Safe global patch for Buffer (for things like base64 encoding/decoding)
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
