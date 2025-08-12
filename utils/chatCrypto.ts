import { getPrivateKey } from '../services/localIdentity';
import { deriveSharedKey, aesEncrypt, aesDecrypt } from './encryption';

// roomKeys stores derived AES keys per chat room. To keep memory usage bounded
// we maintain a simple LRU cache with a fixed size.
const roomKeys = new Map<string, CryptoKey | null>();
const MAX_ROOM_KEYS = 100;

export async function getRoomKey(
  roomId: string,
  peerPublicKey: string,
): Promise<CryptoKey> {
  if (roomKeys.has(roomId)) {
    const cached = roomKeys.get(roomId);
    // refresh LRU ordering
    roomKeys.delete(roomId);
    roomKeys.set(roomId, cached ?? null);
    if (cached) return cached;
    throw new Error('Missing room key');
  }
  try {
    const myPrivEd = await getPrivateKey();
    const key = await deriveSharedKey(myPrivEd, peerPublicKey, roomId);
    roomKeys.set(roomId, key);
    if (roomKeys.size > MAX_ROOM_KEYS) {
      const oldest = roomKeys.keys().next().value;
      roomKeys.delete(oldest);
    }
    return key;
  } catch (err) {
    roomKeys.set(roomId, null);
    throw new Error(`Failed to derive room key: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Encrypt a message with the room key. Throws if the key cannot be derived. */
export async function encryptMessage(
  msg: string,
  roomId: string,
  peerPublicKey: string,
): Promise<string> {
  const key = await getRoomKey(roomId, peerPublicKey);
  return aesEncrypt(msg, key);
}

/** Decrypt a message with the room key. Throws if the key cannot be derived. */
export async function decryptMessage(
  msg: string,
  roomId: string,
  peerPublicKey: string,
): Promise<string> {
  const key = await getRoomKey(roomId, peerPublicKey);
  return aesDecrypt(msg, key);
}
