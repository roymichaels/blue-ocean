const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...(config.resolver || {}),
  alias: {
    ...(config.resolver?.alias || {}),
    '@': path.resolve(__dirname, 'src'),
    '@/*': path.resolve(__dirname, 'src'),
    'metro-transform-plugins/src/inline-plugin.js': path.resolve(
      __dirname,
      'node_modules/metro-transform-plugins/private/inline-plugin.js'
    ),
    ...(process.env.EXPO_WEB_BUNDLER
      ? {
          react: require.resolve('preact/compat'),
          'react-dom': require.resolve('preact/compat'),
          'react/jsx-runtime': require.resolve('preact/jsx-runtime'),
          'react-native': require.resolve('react-native-web-lite'),
          'react-native-web': require.resolve('react-native-web-lite'),
        }
      : {}),
  },
};

config.transformer = {
  ...(config.transformer || {}),
  minifierConfig: {
    ...(config.transformer?.minifierConfig || {}),
    compress: {
      ...(config.transformer?.minifierConfig?.compress || {}),
      drop_console: true,
      drop_debugger: true,
      passes: 2,
      pure_getters: true,
    },
    mangle: {
      ...(config.transformer?.minifierConfig?.mangle || {}),
      toplevel: true,
    },
    output: {
      ...(config.transformer?.minifierConfig?.output || {}),
      comments: false,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
