const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // ✅ Point alias to project root, not src
  config.resolve.alias['@'] = path.resolve(__dirname);

  // ✅ Still necessary for expo-router routing
  process.env.EXPO_ROUTER_APP_ROOT = 'src/app';

  // Optional: manually set entry if needed
  config.entry = [path.resolve(__dirname, 'src/app/_layout.tsx')];

  return config;
};
