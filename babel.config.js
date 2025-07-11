const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
      'expo-router/babel',
      'react-native-reanimated/plugin', // keep last
    ],
  };
};
