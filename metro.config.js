const { getDefaultConfig } = require('@expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-crypto'),
  'react-native-randombytes': require.resolve('./polyfills/react-native-randombytes.ts')
};
module.exports = config;
