const chain = 'near';

export function assertNearChain(): void {
  if (chain !== 'near') {
    throw new Error('BlueOcean is NEAR-only. Set EXPO_PUBLIC_CHAIN=near');
  }
}

export default chain;
