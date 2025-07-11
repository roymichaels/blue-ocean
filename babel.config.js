module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
      '@babel/plugin-transform-modules-commonjs',
      'react-native-reanimated/plugin', // keep this **last**
    ],
  };
};
