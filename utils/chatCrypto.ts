const roomKeys: Record<string, CryptoKey> = {};

/**
 * Derive a deterministic key per room using a shared secret.
 */
import { requireConfig } from './env';

export async function getRoomKey(roomId: string): Promise<CryptoKey> {
  if (roomKeys[roomId]) return roomKeys[roomId];

  const secret = await requireConfig('EXPO_PUBLIC_CHAT_SECRET');
  const enc = new TextEncoder().encode(roomId + secret);
  const hash = await crypto.subtle.digest('SHA-256', enc);

  const key = await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  roomKeys[roomId] = key;
  return key;
}

export async function encryptMessage(msg: string, roomId: string): Promise<string> {
  const key = await getRoomKey(roomId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(msg);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const ivStr = Buffer.from(iv).toString('base64');
  const dataStr = Buffer.from(new Uint8Array(cipher)).toString('base64');
  return ivStr + ':' + dataStr;
}

export async function decryptMessage(msg: string, roomId: string): Promise<string> {
  try {
    const [ivStr, dataStr] = msg.split(':');
    if (!ivStr || !dataStr) return msg;
    const key = await getRoomKey(roomId);
    const iv = Uint8Array.from(Buffer.from(ivStr, 'base64'));
    const data = Uint8Array.from(Buffer.from(dataStr, 'base64'));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(dec);
  } catch {
    return msg;
  }
}
