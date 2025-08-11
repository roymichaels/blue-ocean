const sellerPubKeys: Record<string, string> = {};

export function setSellerPublicKey(address: string, publicKey: string) {
  sellerPubKeys[address] = publicKey;
}

export function getSellerPublicKey(address: string): string | undefined {
  return sellerPubKeys[address];
}

export function removeSellerPublicKey(address: string) {
  delete sellerPubKeys[address];
}

export function listSellerPublicKeys(): { address: string; publicKey: string }[] {
  return Object.entries(sellerPubKeys).map(([address, publicKey]) => ({ address, publicKey }));
}
