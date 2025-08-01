module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@noble/ed25519|react-native)/)'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^expo-file-system$': '<rootDir>/tests/__mocks__/expo-file-system.js',
    '^expo-asset$': '<rootDir>/tests/__mocks__/expo-asset.js',
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.js',
  },
  setupFiles: ['<rootDir>/tests/initGlobals.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.ts'],
};
