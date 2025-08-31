import nearAuth from '../services/nearAuth';

// Legacy name kept for compatibility. Ensures a NEAR wallet session.
export default async function ensureTonWallet(errorMessage: string) {
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
