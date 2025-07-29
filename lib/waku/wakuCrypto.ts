import { Buffer } from 'buffer';
import { requireConfig } from '../../utils/env';

const wakuKeyPromise: { key?: CryptoKey } = {};

/**
 * Derive a deterministic AES-GCM key from the Waku secret.
 */
export async function getWakuKey(): Promise<CryptoKey> {
  if (wakuKeyPromise.key) return wakuKeyPromise.key;
  const secret = await requireConfig('EXPO_PUBLIC_WAKU_SECRET');
  const enc = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
  wakuKeyPromise.key = key;
  return key;
}

export async function encryptWakuPayload(msg: string): Promise<string> {
  const key = await getWakuKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(msg);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const ivStr = Buffer.from(iv).toString('base64');
  const dataStr = Buffer.from(new Uint8Array(cipher)).toString('base64');
  return ivStr + ':' + dataStr;
}

export async function decryptWakuPayload(msg: string): Promise<string> {
  try {
    const [ivStr, dataStr] = msg.split(':');
    if (!ivStr || !dataStr) return msg;
    const key = await getWakuKey();
    const iv = Uint8Array.from(Buffer.from(ivStr, 'base64'));
    const data = Uint8Array.from(Buffer.from(dataStr, 'base64'));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(dec);
  } catch {
    return msg;
  }
}
