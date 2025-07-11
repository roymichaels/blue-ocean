// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Optional: remove buggy plugin in production
  if (config.mode === 'production') {
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );
    config.devtool = 'source-map';
  }

  return config;
};
