const path = require('path');
const baseConfig = require('../jest.config.js');

const tsTransform = Array.isArray(baseConfig.transform?.['^.+\\.tsx?$'])
  ? baseConfig.transform['^.+\\.tsx?$']
  : ['ts-jest', {}];

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '..'),
  collectCoverage: false,
  transform: {
    ...baseConfig.transform,
    '^.+\\.tsx?$': [
      tsTransform[0],
      {
        ...(tsTransform[1] || {}),
        diagnostics: false,
      },
    ],
  },
};
