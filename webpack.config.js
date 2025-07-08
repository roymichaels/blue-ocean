// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  if (config.mode === 'production') {
    // remove Expo’s broken scope‐hoisting plugin in prod
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );
    // optionally keep source-maps:
    config.devtool = 'source-map';
  }

  return config;
};
