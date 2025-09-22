const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@waku/core/lib/message/version_0':
    path.resolve(
      __dirname,
      'node_modules/@waku/core/dist/lib/message/version_0.js'
    ),
  '@waku/core/lib/message/version-0':
    path.resolve(
      __dirname,
      'node_modules/@waku/core/dist/lib/message/version_0.js'
    ),
};

config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@blue-ocean/sdk-near': path.resolve(__dirname, 'packages/sdk-near/src'),
  '@/auth': path.resolve(__dirname, 'src/auth'),
  '@/schemas': path.resolve(__dirname, 'schemas'),
};

if (!config.resolver.sourceExts.includes('mjs'))
  config.resolver.sourceExts.push('mjs');
if (!config.resolver.sourceExts.includes('cjs'))
  config.resolver.sourceExts.push('cjs');

config.transformer = config.transformer || {};
const existingMinifierConfig = config.transformer.minifierConfig || {};
config.transformer.minifierConfig = {
  ...existingMinifierConfig,
  compress: {
    ...(existingMinifierConfig.compress || {}),
    drop_console: true,
    drop_debugger: true,
  },
  mangle: {
    ...(existingMinifierConfig.mangle || {}),
    toplevel: true,
  },
  output: {
    ...(existingMinifierConfig.output || {}),
    comments: false,
  },
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
