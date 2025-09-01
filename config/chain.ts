export const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || 'near').toLowerCase() as 'near';


if (CHAIN !== 'near') {
  throw new Error('BlueOcean is NEAR-only. Set EXPO_PUBLIC_CHAIN=near');
}

export default CHAIN as 'near';

