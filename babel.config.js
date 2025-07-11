module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // No extra plugins are needed currently. Keep reanimated last if more are
    // added in the future.
    plugins: ['react-native-reanimated/plugin'],
  };
};
