const { createWebpackConfigAsync } = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createWebpackConfigAsync(env, argv);

  // 1) prepend our polyfills.js to the very first entry
  const appEntry = config.entry.main;
  config.entry.main = ['./polyfills.js', appEntry];

  // 2) shim missing Node modules
  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert/'),
    util: require.resolve('util/'),
  };

  // 3) auto‐provide Buffer & process
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  // keep your existing source‐map tweak
  if (config.mode === 'production') {
    config.devtool = 'source-map';
  }

  return config;
};
