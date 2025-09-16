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
  '@/auth': path.resolve(__dirname, 'src/auth'),
  '@/schemas': path.resolve(__dirname, 'schemas'),
};

if (!config.resolver.sourceExts.includes('mjs'))
  config.resolver.sourceExts.push('mjs');
if (!config.resolver.sourceExts.includes('cjs'))
  config.resolver.sourceExts.push('cjs');

module.exports = config;
