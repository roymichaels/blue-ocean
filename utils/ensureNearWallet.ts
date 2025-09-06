import { chainAdapter } from '@/services/chain';

// Ensures a NEAR wallet session, prompting sign-in if necessary.
export default async function ensureNearWallet(errorMessage: string) {
  let address = chainAdapter.getAccountId();
  let publicKey = chainAdapter.getPublicKey();
  if (!address || !publicKey) {
    await chainAdapter.openModal();
    address = chainAdapter.getAccountId();
    publicKey = chainAdapter.getPublicKey();
  }
  if (!address || !publicKey) {
    throw new Error(errorMessage);
  }
  return { address, publicKey };
}
