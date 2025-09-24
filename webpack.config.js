// webpack.config.js
const path = require('path');
const fs = require('fs');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  const isProduction = config.mode === 'production';
  const version0 = (() => {
    const candidates = [
      path.resolve(
        __dirname,
        'node_modules/@waku/core/dist/lib/message/version_0.js'
      ),
      path.resolve(
        __dirname,
        'node_modules/@waku/core/lib/message/version_0.js'
      ),
      path.resolve(
        __dirname,
        'node_modules/@waku/core/dist/lib/message/version-0.js'
      ),
      path.resolve(
        __dirname,
        'node_modules/@waku/core/lib/message/version-0.js'
      ),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error('Unable to resolve @waku/core message version 0');
  })();
  const wakuCore = require.resolve('@waku/core', { paths: [__dirname] });

  // Avoid eval-based tooling in dev while keeping production bundles lean
  config.devtool = isProduction ? false : 'source-map';
  // Ensure assets are served relative to index.html for IPFS/URL subpaths
  config.output.publicPath = './';

  // Optional: remove buggy plugin in production and tighten optimizations
  if (isProduction) {
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );

    const existingMinimizers = Array.isArray(config.optimization?.minimizer)
      ? config.optimization.minimizer.filter(
          (plugin) => plugin?.constructor?.name !== 'TerserPlugin'
        )
      : [];

    existingMinimizers.push(
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          format: {
            comments: false,
          },
          mangle: true,
          module: true,
        },
      })
    );

    const existingSplitChunks = config.optimization?.splitChunks || {};

    config.optimization = {
      ...config.optimization,
      minimize: true,
      minimizer: existingMinimizers,
      usedExports: true,
      sideEffects: true,
      splitChunks: {
        ...existingSplitChunks,
        chunks: 'all',
        maxInitialRequests:
          existingSplitChunks.maxInitialRequests &&
          existingSplitChunks.maxInitialRequests < 4
            ? existingSplitChunks.maxInitialRequests
            : 4,
      },
    };
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
    '@/agents': path.resolve(__dirname, 'src/agents'),
    '@/auth': path.resolve(__dirname, 'src/auth'),
    '@/components': path.resolve(__dirname, 'src/components'),
    '@/config': path.resolve(__dirname, 'src/config'),
    '@/constants': path.resolve(__dirname, 'src/constants'),
    '@/contexts': path.resolve(__dirname, 'src/contexts'),
    '@/hooks': path.resolve(__dirname, 'src/hooks'),
    '@/schemas': path.resolve(__dirname, 'src/schemas'),
    '@/services': path.resolve(__dirname, 'src/services'),
    '@/types': path.resolve(__dirname, 'src/types'),
    '@/utils': path.resolve(__dirname, 'src/utils'),
    '@blue-ocean/sdk-near': path.resolve(__dirname, 'packages/sdk-near/src'),
    '@blue-ocean/sdk-near': path.resolve(__dirname, 'packages/sdk-near/dist'),
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
  };

  if (!config.module.rules.some((r) => String(r.test) === '/\\.mjs$/')) {
    config.module.rules.push({ test: /\.mjs$/, type: 'javascript/auto' });
  }

  // Ensure Expo Router's Babel plugin sees the app root
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify('app'),
    })
  );

  return config;
};
