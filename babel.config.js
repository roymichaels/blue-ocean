module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
      'expo-router/babel',
      '@babel/plugin-transform-modules-commonjs',
    ],
  };
};
