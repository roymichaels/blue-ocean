import nearAuth from '@features/auth/services/nearAuth';

// Ensures a NEAR wallet session, prompting sign-in if necessary.
export default async function ensureNearWallet(errorMessage: string) {
  let address = nearAuth.getAccountId();
  if (!address) {
    await nearAuth.signIn();
    address = nearAuth.getAccountId();
  }
  if (!address) {
    throw new Error(errorMessage);
  }
  return { address };
}
