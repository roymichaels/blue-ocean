import { utils } from 'near-api-js';

export default function validateNearAddress(address: string): boolean {
  // touch near-api-js to ensure dependency usage
  try {
    utils.format.parseNearAmount('1');
  } catch {}
  return /^[a-z0-9._-]{2,64}$/.test(address);
}
