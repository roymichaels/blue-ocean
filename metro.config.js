const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm', 'sql', 'boc');
// Force Metro to resolve all modules from the project root so nested copies
// of dependencies (e.g., tslib inside rxjs) are ignored. This ensures our
// custom alias for `tslib` is respected everywhere.
config.resolver.disableHierarchicalLookup = true;

// Map the Expo HMR client to our local wrapper; polyfills are applied at app entry
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@expo/metro-runtime/src/HMRClient': path.resolve(__dirname, 'HMRClient.ts'),
  '@expo/metro-runtime/src/HMRClient.ts': path.resolve(
    __dirname,
    'HMRClient.ts'
  ),
  'react-native/Libraries/Utilities/HMRClient': path.resolve(
    __dirname,
    'EmptyHMRClient.ts'
  ),
  '@noble/hashes': path.resolve(__dirname, 'node_modules/@noble/hashes'),
  '@noble/ed25519': path.resolve(__dirname, 'node_modules/@noble/ed25519'),
  '@noble/hashes/hkdf': require.resolve('@noble/hashes/hkdf'),
  '@noble/hashes/sha256': require.resolve('@noble/hashes/sha256'),
  '@noble/hashes/sha512': require.resolve('@noble/hashes/sha512'),
  '@noble/hashes/crypto': require.resolve('@noble/hashes/crypto'),
  '@noble/hashes/crypto.js': require.resolve('@noble/hashes/crypto'),
  'expo-router': path.resolve(__dirname, 'node_modules/expo-router'),
  'react-native-url-polyfill': path.resolve(
    __dirname,
    'node_modules/react-native-url-polyfill'
  ),
  '@waku/utils': path.resolve(
    __dirname,
    'node_modules/@waku/utils/dist/index.js'
  ),
  'multiformats/hashes/sha2': path.resolve(
    __dirname,
    'node_modules/multiformats/dist/src/hashes/sha2.js'
  ),
  multiformats: path.resolve(
    __dirname,
    'node_modules/multiformats/dist/src/index.js'
  ),
  tslib: path.resolve(__dirname, 'tslib-polyfill.js'),
  // Ensure Metro resolves tslib's ESM entry to a CommonJS-compatible module
  // that includes a default export. Without this, packages that rely on the
  // default export (e.g. rxjs) will crash at runtime because `tslib`'s
  // generated `modules/index.js` attempts to destructure from an undefined
  // default export.
  'tslib/modules/index.js': path.resolve(__dirname, 'tslib-polyfill.js'),
};

module.exports = config;
