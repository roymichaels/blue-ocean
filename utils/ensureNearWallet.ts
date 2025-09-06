import { chainAdapter } from '@/services/chain';

// Ensures a NEAR wallet session, prompting sign-in if necessary.
export default async function ensureNearWallet(errorMessage: string) {
  let address = chainAdapter.getAccountId();
  if (!address) {
    await chainAdapter.openModal();
    address = chainAdapter.getAccountId();
  }
  if (!address) {
    throw new Error(errorMessage);
  }
  return { address };
}
