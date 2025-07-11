module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // sdk 50 already includes expo-router
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  };
};
