// webpack.config.js
const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Optional: remove buggy plugin in production
  if (config.mode === 'production') {
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );
    config.devtool = 'source-map';
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
    'react-native/Libraries/Utilities/HMRClient': path.resolve(
      __dirname,
      'EmptyHMRClient.ts'
    ),
  };

  return config;
};
