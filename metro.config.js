const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

// Metro expects POSIX-style paths for module aliases. On Windows, `path.resolve`
// returns paths with backslashes which can cause `decodeURI` to throw
// "URI malformed" when the bundler serves assets. Convert any resolved paths to
// POSIX format so Metro can safely decode them on all platforms.
const toPosix = (p) => p.split(path.sep).join(path.posix.sep);
const resolvePosix = (...segments) => toPosix(path.resolve(...segments));
const requirePosix = (id) => toPosix(require.resolve(id));


const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm', 'sql', 'boc');
// Allow Metro's default hierarchical lookup to avoid breaking deep imports
// like `react-native-web/dist/exports/*` used in web transforms.
// If needed, we can revisit this after web bundling is stable.
// config.resolver.disableHierarchicalLookup = true;

// Enable Node-style package "exports" field so modules like
// @waku/core that export subpaths (e.g., ./lib/message/version_0)
// resolve to their intended dist files.
config.resolver.unstable_enablePackageExports = true;

// Map the Expo HMR client to our local wrapper; polyfills are applied at app entry
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
  // Ensure '@expo/metro-runtime' resolves for Expo Router entry on all platforms
  '@expo/metro-runtime': resolvePosix(
    __dirname,
    'node_modules/@expo/metro-runtime'
  ),
  '@babel/runtime': resolvePosix(
    __dirname,
    'node_modules/@babel/runtime'
  ),
  react: resolvePosix(__dirname, 'node_modules/react'),
    'react-dom': resolvePosix(__dirname, 'node_modules/react-dom'),
    // Force single copies of React Navigation libs to avoid context mismatches
    '@react-navigation/native': resolvePosix(
      __dirname,
      'node_modules/@react-navigation/native'
    ),
    '@react-navigation/bottom-tabs': resolvePosix(
      __dirname,
      'node_modules/@react-navigation/bottom-tabs'
    ),
    '@react-navigation/native-stack': resolvePosix(
      __dirname,
      'node_modules/@react-navigation/native-stack'
    ),
    '@react-navigation/core': resolvePosix(
      __dirname,
      'node_modules/@react-navigation/core'
    ),
  // NOTE: Do not alias 'react-native' here; Metro handles web mapping to RNW
  '@expo/metro-runtime/src/HMRClient': resolvePosix(
    __dirname,
    'HMRClient.ts'
  ),
  '@expo/metro-runtime/src/HMRClient.ts': resolvePosix(
    __dirname,
    'HMRClient.ts'
  ),
  '@noble/hashes': resolvePosix(__dirname, 'node_modules/@noble/hashes'),
  '@noble/ed25519': resolvePosix(__dirname, 'node_modules/@noble/ed25519'),
  '@noble/hashes/hkdf': requirePosix('@noble/hashes/hkdf'),
  '@noble/hashes/sha256': requirePosix('@noble/hashes/sha256'),
  '@noble/hashes/sha512': requirePosix('@noble/hashes/sha512'),
  '@noble/hashes/crypto': requirePosix('@noble/hashes/crypto'),
  '@noble/hashes/crypto.js': requirePosix('@noble/hashes/crypto'),
  'expo-router': resolvePosix(__dirname, 'node_modules/expo-router'),
  'react-native-url-polyfill': resolvePosix(
    __dirname,
    'node_modules/react-native-url-polyfill'
  ),
  '@waku/utils': resolvePosix(
    __dirname,
    'node_modules/@waku/utils/dist/index.js'
  ),
  'multiformats/hashes/sha2': resolvePosix(
    __dirname,
    'node_modules/multiformats/dist/src/hashes/sha2.js'
  ),
  'multiformats/hashes/sha2-browser': resolvePosix(
    __dirname,
    'node_modules/multiformats/dist/src/hashes/sha2-browser.js'
  ),
  multiformats: resolvePosix(
    __dirname,
    'node_modules/multiformats/dist/src/index.js'
=======
  'multiformats/hashes/sha2': toPosix(
    path.resolve(
      __dirname,
      'node_modules/multiformats/dist/src/hashes/sha2.js'
    )
  ),
  'multiformats/hashes/sha2-browser': toPosix(
    path.resolve(
      __dirname,
      'node_modules/multiformats/dist/src/hashes/sha2-browser.js'
    )
  ),
  multiformats: toPosix(
    path.resolve(
      __dirname,
      'node_modules/multiformats/dist/src/index.js'
    )
  ),
  tslib: resolvePosix(__dirname, 'tslib-polyfill.js'),
  // Ensure Metro resolves tslib's ESM entry to a CommonJS-compatible module
  // that includes a default export. Without this, packages that rely on the
  // default export (e.g. rxjs) will crash at runtime because `tslib`'s
  // generated `modules/index.js` attempts to destructure from an undefined
  // default export.
  'tslib/modules/index.js': resolvePosix(__dirname, 'tslib-polyfill.js'),
  };

  // Hard alias nested imports that some packages resolve internally so they
  // point to the single root copy. This avoids duplicate navigation contexts
  // which cause the "Couldn't register the navigator" error.
  config.resolver.alias = {
    ...(config.resolver.alias || {}),
    '@react-navigation/native-stack/node_modules/@react-navigation/core': resolvePosix(
      __dirname,
      'node_modules/@react-navigation/core'
    ),
    '@react-navigation/native/node_modules/@react-navigation/core': resolvePosix(
      __dirname,
      'node_modules/@react-navigation/core'
    ),
  };

module.exports = config;
