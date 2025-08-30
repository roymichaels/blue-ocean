export const CHAIN = (process.env.EXPO_PUBLIC_CHAIN ?? 'near') as 'near';

if (CHAIN !== 'near') {
  throw new Error('BlueOcean is NEAR-only for MVP');
}

export default CHAIN;

