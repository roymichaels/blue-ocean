let cached: { publicKey: string; privateKey: string } | null = null;

export async function getWakuIdentity(): Promise<{ publicKey: string; privateKey: string }> {
  if (cached) return cached;
  const ed = await import('@noble/ed25519');
  let privHex = process.env.EXPO_PUBLIC_WAKU_PRIVATE_KEY;
  let pubHex = process.env.EXPO_PUBLIC_WAKU_PUBLIC_KEY;
  if (!privHex) {
    const priv = ed.utils.randomPrivateKey();
    privHex = Buffer.from(priv).toString('hex');
    const pub = await ed.getPublicKey(priv);
    pubHex = Buffer.from(pub).toString('hex');
  } else if (!pubHex) {
    const priv = Uint8Array.from(Buffer.from(privHex, 'hex'));
    const pub = await ed.getPublicKey(priv);
    pubHex = Buffer.from(pub).toString('hex');
  }
  cached = { publicKey: pubHex!, privateKey: privHex };
  return cached;
}
