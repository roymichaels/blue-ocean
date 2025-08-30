export function assertNearChain() {
  const chain = (process.env.EXPO_PUBLIC_CHAIN || process.env.CHAIN || '').toLowerCase();
  if (chain && chain !== 'near') {
    throw new Error('CHAIN guard: only NEAR is supported in this build');
  }
}

export default { assertNearChain };

