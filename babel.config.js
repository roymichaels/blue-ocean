module.exports = function (api) {
  api.cache(true);
  return {
    // 'babel-preset-expo' already includes the React Native preset, so
    // including 'module:metro-react-native-babel-preset' causes plugins like
    // 'transform-react-jsx-self' to run twice and inject duplicate props.
    presets: ['babel-preset-expo'],
  };
};
