const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm', 'sql');

// Map the Expo HMR client to our local wrapper so Buffer and Web Crypto are polyfilled
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@expo/metro-runtime/src/HMRClient': path.resolve(__dirname, 'HMRClient.ts'),
  '@expo/metro-runtime/src/HMRClient.ts': path.resolve(__dirname, 'HMRClient.ts'),
  'react-native/Libraries/Utilities/HMRClient': path.resolve(
    __dirname,
    'EmptyHMRClient.ts'
  ),
  '@noble/hashes/crypto.js': require.resolve('@noble/hashes/lib/crypto.js'),
  '@waku/sdk': require.resolve('@waku/sdk/bundle/index.js'),
  multiformats: require.resolve('multiformats/dist/index.min.js'),
};

module.exports = config;
