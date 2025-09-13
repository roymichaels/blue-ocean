const isCI = process.env.CI === 'true';

/** @type {import('jest').Config} */
const cfg = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, babelConfig: true }],
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@noble/ed25519|react-native|expo|expo-linear-gradient|react-native-svg|lucide-react-native|@blue-ocean/utils|@blue-ocean/sdk-near|@waku/.*)/)',
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/contracts/**/*.ts',
    '<rootDir>/services/**/*.ts',
    '<rootDir>/src/ui/**/*.{ts,tsx}',
  ],
  // Enforce strict coverage thresholds only in CI
  ...(isCI
    ? {
        coverageThreshold: {
          './contracts/': { statements: 80, branches: 80, functions: 80, lines: 80 },
          './services/': { statements: 70, branches: 70, functions: 70, lines: 70 },
          './src/ui/': { statements: 60, branches: 60, functions: 60, lines: 60 },
        },
      }
    : {}),

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^expo-file-system$': '<rootDir>/tests/__mocks__/expo-file-system.js',
    '^expo-asset$': '<rootDir>/tests/__mocks__/expo-asset.js',
    '^expo-secure-store$': '<rootDir>/tests/__mocks__/expo-secure-store.js',
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.js',
    '^@shopify/flash-list$': '<rootDir>/tests/__mocks__/@shopify/flash-list.js',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@/features/(.*)$': '<rootDir>/src/features/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@/ui$': '<rootDir>/src/ui/index',
    '^@/layout/(.*)$': '<rootDir>/src/layout/$1',
    '^@/services$': '<rootDir>/src/services/index',
    '^@/services/(.*)$': ['<rootDir>/src/services/$1', '<rootDir>/services/$1'],
    '^@/utils/(.*)$': ['<rootDir>/src/utils/$1', '<rootDir>/utils/$1'],
    '^@/providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@/providers$': '<rootDir>/src/providers/index',
    '^@/i18n$': '<rootDir>/src/i18n',
    '^@/(.*)$': '<rootDir>/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    // Optional: lightweight stubs for problematic RN libs in Node env
    '^react-native-svg$': '<rootDir>/tests/__mocks__/react-native.js',
    // Expo's ESM-only virtual env module trips Jest; stub it
    '^expo/virtual/env$': '<rootDir>/tests/__mocks__/expoEnv.js',
    // Native-safe-area provider needs a mock in Node
    '^react-native-safe-area-context$': '<rootDir>/tests/__mocks__/react-native-safe-area-context.js',
    // ESM-only expo-video-thumbnails -> mock in tests
    '^expo-video-thumbnails$': '<rootDir>/tests/__mocks__/expo-video-thumbnails.js',
    '^lucide-react-native$': '<rootDir>/tests/__mocks__/lucide-react-native.js',
    '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.js',
  },
  testMatch: [
    '<rootDir>/tests/storeIsolation.test.ts',
    '<rootDir>/tests/admin-disputes.test.tsx',
    '<rootDir>/tests/storeDashboard.test.tsx',
    '<rootDir>/tests/admin-impersonate.test.tsx',
    '<rootDir>/tests/admin-store-detail.test.tsx',
    '<rootDir>/tests/not-found.test.tsx',
    '<rootDir>/tests/wakuErrorLogging.test.ts',
    '<rootDir>/tests/wakuHydration.test.ts',
    '<rootDir>/tests/nearAdapter.test.ts',
    '<rootDir>/tests/waku/**/*.test.ts',
    '<rootDir>/tests/i18n-offline.test.ts',
    '<rootDir>/tests/smoke.test.ts',
    '<rootDir>/tests/navigation.test.ts',
    '<rootDir>/tests/CheckedQueryClientProvider.test.tsx',
    '<rootDir>/tests/appProvidersSingleQueryClient.test.tsx',
    '<rootDir>/tests/signupLogic.test.ts',
    '<rootDir>/tests/nearKvPersistence.test.ts',
    '<rootDir>/tests/homeScreenRender.test.tsx',
    '<rootDir>/tests/homeFallbackVisibility.test.tsx',
    '<rootDir>/tests/navigationLoop.test.tsx',
    '<rootDir>/tests/themeContrast.test.tsx',
    '<rootDir>/tests/priceRange.test.tsx',
    '<rootDir>/tests/wallet/**/*.test.ts',
    '<rootDir>/tests/indexers/**/*.test.ts',
    '<rootDir>/tests/auth/**/*.test.ts',
    '<rootDir>/tests/auth/**/*.test.tsx',
  ],
  setupFiles: ['<rootDir>/tests/initGlobals.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.ts'],
  globalSetup: '<rootDir>/tests/lintTypeCheck.js',
};

module.exports = cfg;
