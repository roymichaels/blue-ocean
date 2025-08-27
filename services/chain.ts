import { requireEnv } from '../utils/appConfig';

const chain = requireEnv('EXPO_PUBLIC_CHAIN');

if (chain !== 'near') {
  throw new Error(`Unsupported chain: ${chain}`);
}

export default chain;
