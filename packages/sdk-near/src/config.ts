// Minimal configuration loader for the SDK. Reads required
// environment variables and exposes them as a simple object.

const config: Record<string, string> = {
  EXPO_PUBLIC_RELAYER_URL: process.env.EXPO_PUBLIC_RELAYER_URL || '',
  EXPO_PUBLIC_INDEXER_URL: process.env.EXPO_PUBLIC_INDEXER_URL || '',
  EXPO_PUBLIC_TRANSPORT: process.env.EXPO_PUBLIC_TRANSPORT || '',
  EXPO_PUBLIC_MIXER_URL: process.env.EXPO_PUBLIC_MIXER_URL || '',
  EXPO_PUBLIC_MIXER_FALLBACK_URL: process.env.EXPO_PUBLIC_MIXER_FALLBACK_URL || '',
};

export default config;

export function getNetworkId(): string {
  const explicit =
    process.env.EXPO_PUBLIC_NETWORK ||
    process.env.EXPO_PUBLIC_NETWORK_ID ||
    process.env.EXPO_PUBLIC_NEAR_NETWORK_ID ||
    process.env.NEAR_NETWORK_ID ||
    process.env.NETWORK_ID;
  if (explicit) return explicit;
  const cid =
    process.env.EXPO_PUBLIC_CONTRACT_ID ||
    process.env.CONTRACT_ID ||
    '';
  return cid.endsWith('.testnet') ? 'testnet' : 'mainnet';
}

