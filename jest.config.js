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
        'expo',
        'expo-linear-gradient',
        'react-native-svg',
        'lucide-react-native',
        '@waku/.*',
        'uuid',
      ].join('|') +
      ')/)',
  ],

  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}', '<rootDir>/App.tsx'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/application/(.*)$': '<rootDir>/src/application/$1',
    '^@/logic/(.*)$': '<rootDir>/src/logic/$1',
    '^@/data/(.*)$': '<rootDir>/src/data/$1',
    '^@/ui/(.*)$': '<rootDir>/src/ui/$1',
  },

  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
};

module.exports = cfg;



