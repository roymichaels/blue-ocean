const isCI = process.env.CI === 'true';

/** @type {import('jest').Config} */
const cfg = {
  // Keep ts-jest ESM preset
  preset: 'ts-jest/presets/default-esm',

  // Use jsdom so RN/React trees render in tests
  testEnvironment: 'jest-environment-jsdom',

  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        babelConfig: true,
        tsconfig: '<rootDir>/tsconfig.jest.json',
        diagnostics: {
          ignoreCodes: [2345, 2554, 7006, 2459, 2307],
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },

  // Allow these packages to be transpiled by Babel
  transformIgnorePatterns: [
    '/node_modules/(?!(' +
      [
        '@noble/ed25519',
        'react-native',
        'react-native-reanimated',
        'react-native-worklets',
        'expo',
        'expo-linear-gradient',
        'react-native-svg',
        'lucide-react-native',
        '@blue-ocean/utils',
        '@blue-ocean/sdk-near',
        '@waku/.*',
        'uuid',
      ].join('|') +
      ')/)',
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/contracts/**/*.ts',
    '<rootDir>/services/**/*.ts',
    '<rootDir>/src/ui/**/*.{ts,tsx}',
  ],

  ...(isCI
    ? {
        coverageThreshold: {
          './contracts/': {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80,
          },
          './services/': {
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70,
          },
          './src/ui/': {
            statements: 60,
            branches: 60,
            functions: 60,
            lines: 60,
          },
        },
      }
    : {}),

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^expo-file-system$': '<rootDir>/tests/__mocks__/expo-file-system.js',
    '^expo-asset$': '<rootDir>/tests/__mocks__/expo-asset.js',
    '^expo-secure-store$': '<rootDir>/tests/__mocks__/expo-secure-store.js',
    '^expo-local-authentication$': '<rootDir>/tests/__mocks__/expo-local-authentication.js',
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
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@/services$': '<rootDir>/src/services/index',
    '^@/services/(.*)$': ['<rootDir>/src/services/$1', '<rootDir>/services/$1'],
    '^@/billing$': '<rootDir>/src/billing/index',
    '^@/billing/(.*)$': '<rootDir>/src/billing/$1',
    '^@/utils/(.*)$': ['<rootDir>/src/utils/$1', '<rootDir>/utils/$1'],
    '^@/providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@/providers$': '<rootDir>/src/providers/index',
    '^@/i18n$': '<rootDir>/src/i18n',
    '^@/schemas/(.*)$': '<rootDir>/schemas/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^src/(.*)$': '<rootDir>/src/$1',

    // Light stubs for RN libs in Node env
    '^react-native-svg$': '<rootDir>/tests/__mocks__/react-native.js',
    '^expo/virtual/env$': '<rootDir>/tests/__mocks__/expoEnv.js',
    '^react-native-safe-area-context$':
      '<rootDir>/tests/__mocks__/react-native-safe-area-context.js',
    '^expo-video-thumbnails$':
      '<rootDir>/tests/__mocks__/expo-video-thumbnails.js',
    '^lucide-react-native$': '<rootDir>/tests/__mocks__/lucide-react-native.js',
    '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.js',

    // Silence RN Animated helper warnings
    'react-native/Libraries/Animated/NativeAnimatedHelper':
      '<rootDir>/tests/__mocks__/NativeAnimatedHelper.js',
  },

  testMatch: [
    '<rootDir>/tests/storeIsolation.test.ts',
    '<rootDir>/tests/admin-disputes.test.tsx',
    '<rootDir>/tests/storeDashboard.test.tsx',
    '<rootDir>/tests/storeCreation.snapshot.test.tsx',
    '<rootDir>/tests/adminDeliveries.snapshot.test.tsx',
    '<rootDir>/tests/admin-impersonate.test.tsx',
    '<rootDir>/tests/admin-store-detail.test.tsx',
    '<rootDir>/tests/not-found.test.tsx',
    '<rootDir>/tests/wakuErrorLogging.test.ts',
    '<rootDir>/tests/wakuHydration.test.ts',
    '<rootDir>/tests/nearAdapter.test.ts',
    '<rootDir>/tests/adminAgent.test.ts',
    '<rootDir>/tests/waku/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/notificationsPipeline.test.ts',
    '<rootDir>/tests/i18n-offline.test.ts',
    '<rootDir>/tests/smoke.test.ts',
    '<rootDir>/tests/navigation.test.ts',
    '<rootDir>/tests/CheckedQueryClientProvider.test.tsx',
    '<rootDir>/tests/appProvidersSingleQueryClient.test.tsx',
    '<rootDir>/tests/signupLogic.test.ts',
    '<rootDir>/tests/nearKvPersistence.test.ts',
    '<rootDir>/tests/homeScreenRender.test.tsx',
    '<rootDir>/tests/homeFallbackVisibility.test.tsx',
    '<rootDir>/tests/homeServices.test.tsx',
    '<rootDir>/tests/featuredStoresCarousel.test.tsx',
    '<rootDir>/tests/navigationLoop.test.tsx',
    '<rootDir>/tests/themeContrast.test.tsx',
    '<rootDir>/tests/priceRange.test.tsx',
    '<rootDir>/tests/wallet/**/*.test.ts',
    '<rootDir>/tests/indexers/**/*.test.ts',
    '<rootDir>/tests/auth/**/*.test.ts',
    '<rootDir>/tests/auth/**/*.test.tsx',
    '<rootDir>/tests/auth/**/*.spec.ts',
    '<rootDir>/tests/launchGate/**/*.test.ts',
    '<rootDir>/tests/launchGate/**/*.test.tsx',
  ],

  setupFiles: ['<rootDir>/tests/initGlobals.ts'],

  // IMPORTANT: load Reanimated’s jest setup BEFORE your env to install globals
  setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.ts'],

  globalSetup: '<rootDir>/tests/lintTypeCheck.js',
};

module.exports = cfg;
