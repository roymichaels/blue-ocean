import 'react-native-get-random-values';
import { Buffer } from 'buffer';
// Ensure Buffer is available globally for any modules that expect it
(global as any).Buffer = Buffer;
import 'expo-standard-web-crypto';

const MetroHMRClient = require('metro-runtime/src/modules/HMRClient');
export default MetroHMRClient;
export * from 'metro-runtime/src/modules/HMRClient';
