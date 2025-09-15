const path = require('path');
const webpack = require('webpack');

const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  const mode = argv.mode || 'development';

  config.entry = {
    main: path.resolve(__dirname, 'src/index.tsx'),
  };

  config.output = {
    ...config.output,
    filename: mode === 'production' ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
    chunkFilename:
      mode === 'production' ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
    publicPath: './',
  };

  config.optimization = {
    ...config.optimization,
    runtimeChunk: 'single',
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 30,
      maxAsyncRequests: 30,
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react-vendors',
          chunks: 'all',
          priority: -5,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: -10,
        },
      },
    },
  };

  config.performance = {
    ...config.performance,
    hints: false,
  };

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.DefinePlugin({
      __PWA_BUILD__: JSON.stringify(mode === 'production'),
    }),
  );
  return config;
};
