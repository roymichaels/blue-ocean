import { requireEnv } from '../utils/appConfig';

const chain = requireEnv('EXPO_PUBLIC_CHAIN');

if (!['near', 'ton'].includes(chain)) {
  throw new Error(`Unsupported chain: ${chain}`);
}

export function assertTonChain(): void {
  if (chain !== 'ton') {
    throw new Error(
      `TON helpers are disabled when EXPO_PUBLIC_CHAIN is "${chain}"`,
    );
  }
}

export default chain;
