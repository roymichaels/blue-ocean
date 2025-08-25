// webpack.config.js
const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Use source maps in all modes to avoid eval-based tooling which can violate CSP
  config.devtool = 'source-map';
  // Ensure assets are served relative to index.html for IPFS/URL subpaths
  config.output.publicPath = './';

  // Optional: remove buggy plugin in production
  if (config.mode === 'production') {
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );
  }

  // Polyfill Node.js core modules used by some dependencies
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert'),
    util: require.resolve('util'),
    process: require.resolve('process/browser'),
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Match Metro alias for the custom HMR client
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@expo/metro-runtime/src/HMRClient': path.resolve(__dirname, 'HMRClient.ts'),
    '@expo/metro-runtime/src/HMRClient.ts': path.resolve(__dirname, 'HMRClient.ts'),
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
    'expo-router/entry': require.resolve('expo-router/entry'),
    'react-native-url-polyfill': path.resolve(
      __dirname,
      'node_modules/react-native-url-polyfill'
    ),
    tslib: require.resolve('tslib'),
  };

  return config;
};
