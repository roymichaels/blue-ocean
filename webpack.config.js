// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Tell Webpack to swap out react-native-randombytes for your JS polyfill:
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-native-randombytes': path.resolve(
      __dirname,
      'polyfills/react-native-randombytes.ts'
    ),
  };

  return config;
};
