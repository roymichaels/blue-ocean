// TODO:KYC-005 per-tenant shared key derivation (HKDF over ECDH)
export async function deriveTenantSharedKey(tenantPubKeyHex: string, userPrivKeyHex: string): Promise<Uint8Array> {
  // stub
  void tenantPubKeyHex;
  void userPrivKeyHex;
  return new Uint8Array(32);
}
