// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // rely on Expo's default Node.js polyfills
  // previously polyfills were disabled here but that caused issues with packages

  if (config.mode === 'production') {
    // remove Expo’s broken scope‐hoisting plugin in prod
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );
    config.devtool = 'source-map';
  }

  return config;
};
