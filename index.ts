import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer as any;
}
if (typeof global.__filename === 'undefined') {
  (global as any).__filename = '';
}
if (Platform.OS === 'web') {
  require('react-native-url-polyfill/auto');
}

export { default } from 'expo-router/entry';
