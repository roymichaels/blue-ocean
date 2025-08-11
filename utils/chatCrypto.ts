import { getPrivateKey } from '../services/localIdentity';
import { deriveSharedKey, aesEncrypt, aesDecrypt } from './encryption';

const roomKeys: Record<string, CryptoKey | null> = {};

export async function getRoomKey(
  roomId: string,
  peerPublicKey: string,
): Promise<CryptoKey | null> {
  if (roomKeys.hasOwnProperty(roomId)) return roomKeys[roomId];
  try {
    const myPrivEd = await getPrivateKey();
    const key = await deriveSharedKey(myPrivEd, peerPublicKey, roomId);
    roomKeys[roomId] = key;
    return key;
  } catch (err) {
    console.warn('Failed to derive room key', err);
    roomKeys[roomId] = null;
    return null;
  }
}

export async function encryptMessage(
  msg: string,
  roomId: string,
  peerPublicKey: string,
): Promise<string> {
  const key = await getRoomKey(roomId, peerPublicKey);
  if (!key) return msg;
  return aesEncrypt(msg, key);
}

export async function decryptMessage(
  msg: string,
  roomId: string,
  peerPublicKey: string,
): Promise<string> {
  try {
    const key = await getRoomKey(roomId, peerPublicKey);
    if (!key) return msg;
    return await aesDecrypt(msg, key);
  } catch {
    return msg;
  }
}
