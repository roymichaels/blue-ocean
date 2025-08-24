const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm', 'sql', 'boc');

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
  '@noble/hashes': require.resolve('@noble/hashes'),
  '@noble/hashes/hkdf': require.resolve('@noble/hashes/hkdf'),
  '@noble/hashes/sha256': require.resolve('@noble/hashes/sha256'),
  '@noble/hashes/sha512': require.resolve('@noble/hashes/sha512'),
  '@noble/hashes/crypto': require.resolve('@noble/hashes/crypto'),
  '@noble/hashes/crypto.js': require.resolve('@noble/hashes/crypto'),
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
  tslib: require.resolve('tslib'),
};

module.exports = config;
