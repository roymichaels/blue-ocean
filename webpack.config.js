// webpack.config.js
const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  const version0 = require.resolve('@waku/core/lib/message/version-0', {
    paths: [__dirname],
  });
  const wakuCore = require.resolve('@waku/core', { paths: [__dirname] });

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
    process: require.resolve('process'),
    crypto: require.resolve('crypto-browserify'),
    vm: false,
    http: false,
    https: false,
    fs: false,
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Minimal, safe aliases for web
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@': path.resolve(__dirname),
    'expo-router/_ctx': path.resolve(__dirname, 'router-ctx.web.js'),
    'expo-router/_ctx.web': path.resolve(__dirname, 'router-ctx.web.js'),
    'expo-router/_ctx.web.js': path.resolve(__dirname, 'router-ctx.web.js'),
    // Map @waku/utils/bytes subpath directly to avoid deep import issues
    '@waku/utils/bytes': path.resolve(
      __dirname,
      'node_modules/@waku/utils/dist/bytes/index.js'
    ),
    '@waku/core/lib/message/version_0': version0,
    '@waku/core/lib/message/version-0': version0,
    '@waku/core$': wakuCore,
    '@blue-ocean/utils': path.resolve(__dirname, 'shims/bo-utils.js'),
    'fs/promises': false,
    // Avoid bundling Node-only NEAR provider in web builds
    '@near-js/providers': false,
    'node-fetch': false,
    'react-native-url-polyfill': path.resolve(
      __dirname,
      'node_modules/react-native-url-polyfill'
    ),
    tslib: require.resolve('tslib'),
    'tslib/modules/index.js': path.resolve(__dirname, 'tslib-polyfill.js'),
  };

  config.module.rules.push({ test: /\.mjs$/, type: 'javascript/auto' });

  // Ensure Expo Router's Babel plugin sees the app root
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify('app'),
    })
  );

  return config;
};
