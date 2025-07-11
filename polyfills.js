import 'expo-standard-web-crypto';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
import * as SafeAreaContext from 'react-native-safe-area-context';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.require === 'undefined') {
  global.require = (moduleName) => {
    if (moduleName === 'react-native-safe-area-context') {
      return SafeAreaContext;
    }
    throw new Error(`Cannot find module '${moduleName}'`);
  };
}

