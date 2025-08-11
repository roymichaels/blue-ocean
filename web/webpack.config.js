const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  config.output.publicPath = "./"; // Use relative URLs for IPFS
  return config;
};
