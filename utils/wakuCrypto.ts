let keyPromise: Promise<CryptoKey> | undefined;

async function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = process.env.EXPO_PUBLIC_SYNC_SECRET || 'default_sync_secret';
    const enc = new TextEncoder().encode(secret);
    keyPromise = crypto.subtle
      .digest('SHA-256', enc)
      .then((hash) =>
        crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
          'encrypt',
          'decrypt',
        ]),
      );
  }
  return keyPromise;
}

export async function encryptSyncMessage(msg: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(msg);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const ivStr = Buffer.from(iv).toString('base64');
  const dataStr = Buffer.from(new Uint8Array(cipher)).toString('base64');
  return ivStr + ':' + dataStr;
}

export async function decryptSyncMessage(msg: string): Promise<string> {
  try {
    const [ivStr, dataStr] = msg.split(':');
    if (!ivStr || !dataStr) return msg;
    const key = await getKey();
    const iv = Uint8Array.from(Buffer.from(ivStr, 'base64'));
    const data = Uint8Array.from(Buffer.from(dataStr, 'base64'));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(dec);
  } catch {
    return msg;
  }
}
