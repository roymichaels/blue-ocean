import CHAIN from '@/config/chain';

export function assertNearChain(): void {
  if (CHAIN !== 'near') {
    throw new Error('BlueOcean is NEAR-only. Set EXPO_PUBLIC_CHAIN=near');
  }
}

export default assertNearChain;