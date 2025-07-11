const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Fix for expo-crypto, uuid, etc.
  config.module.rules.unshift({
    test: /\.js$/,
    include: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['babel-preset-expo'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    },
  });

  return config;
};
