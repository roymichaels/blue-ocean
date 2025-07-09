import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';

if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

