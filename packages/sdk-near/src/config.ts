// Minimal configuration loader for the SDK. Reads required
// environment variables and exposes them as a simple object.

const config: Record<string, string> = {
  EXPO_PUBLIC_RELAYER_URL: process.env.EXPO_PUBLIC_RELAYER_URL || '',
  EXPO_PUBLIC_INDEXER_URL: process.env.EXPO_PUBLIC_INDEXER_URL || '',
  EXPO_PUBLIC_TRANSPORT: process.env.EXPO_PUBLIC_TRANSPORT || '',
};

export default config;

