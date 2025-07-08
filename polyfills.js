// polyfills.js
import 'react-native-get-random-values'; // ensure crypto.getRandomValues
import 'react-native-url-polyfill/auto'; // URL, URLSearchParams, Headers
import { Buffer } from 'buffer';

// expose Buffer globally
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// optional: satisfy modules expecting __filename
if (typeof global.__filename === 'undefined') {
  global.__filename = '';
}
