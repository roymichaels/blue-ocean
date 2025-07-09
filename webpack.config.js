// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // disable all Node.js polyfills that are causing trouble
  config.resolve.fallback = {
    crypto: false,
    buffer: false,
    stream: false,
    util: false,
    url: false,
    path: false,
  };

  if (config.mode === 'production') {
    // remove Expo’s broken scope‐hoisting plugin in prod
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'WebpackDeepScopeAnalysisPlugin'
    );
    config.devtool = 'source-map';
  }

  return config;
};
