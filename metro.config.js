const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm', 'sql');

// Resolve package roots to avoid Node's fallbacks to non-browser builds
const nobleHashesPath = path.resolve(__dirname, 'node_modules/@noble/hashes');
const multiformatsPath = path.resolve(__dirname, 'node_modules/multiformats');

// Map the Expo HMR client to our local wrapper so Buffer and Web Crypto are polyfilled
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
  '@noble/hashes': path.join(nobleHashesPath, 'index.js'),
  '@noble/hashes/crypto': path.join(nobleHashesPath, 'crypto.js'),
  '@noble/hashes/crypto.js': path.join(nobleHashesPath, 'crypto.js'),
  '@waku/sdk': path.resolve(
    __dirname,
    'node_modules/@waku/sdk/bundle/index.js'
  ),
  multiformats: path.join(multiformatsPath, 'dist/index.min.js'),
};

module.exports = config;
