// Jest mock for Expo's ESM-only `expo/virtual/env` entry.
// Provides a named export `env` compatible with consumers.
module.exports = {
  __esModule: true,
  env: process.env,
  default: { env: process.env },
};

