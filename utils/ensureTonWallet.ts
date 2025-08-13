import tonAuth from '../services/tonAuth';

export default async function ensureTonWallet(errorMessage: string) {
  let address = tonAuth.getAddress();
  let publicKey = tonAuth.getTonPublicKey();
  if (!address || !publicKey) {
    await tonAuth.openModal();
    address = tonAuth.getAddress();
    publicKey = tonAuth.getTonPublicKey();
  }
  if (!address || !publicKey) {
    throw new Error(errorMessage);
  }
  return { address, publicKey };
}
