// polyfills.js
import 'react-native-get-random-values';
import 'expo-standard-web-crypto';
import 'react-native-url-polyfill/auto';

import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
