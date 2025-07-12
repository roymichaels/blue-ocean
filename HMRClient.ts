import 'react-native-get-random-values';
import { Buffer } from 'buffer';
// Ensure Buffer is available globally for any modules that expect it
(global as any).Buffer = Buffer;
import 'expo-standard-web-crypto';

// Re-export Metro's HMRClient after applying the polyfills above
export { default } from 'metro-runtime/src/modules/HMRClient';
export * from 'metro-runtime/src/modules/HMRClient';
