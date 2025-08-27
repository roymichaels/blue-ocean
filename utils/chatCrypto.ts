import { getEd25519KeyPair } from '../services/localIdentity';
import { deriveSharedKey, aesEncrypt, aesDecrypt, deriveChatSalt } from './encryption';

// roomKeys stores derived AES keys per chat room. To keep memory usage bounded
// we maintain a simple LRU cache with a fixed size.
const roomKeys = new Map<string, CryptoKey>();
const MAX_ROOM_KEYS = 100;

// Track failed derivations to avoid hammering key generation when it previously
// failed. After a cooldown, we allow another attempt.
const failedDerivations = new Map<string, number>();
const DERIVATION_COOLDOWN_MS = 60_000;

export async function getRoomKey(
  roomId: string,
  peerPublicKey: string,
): Promise<CryptoKey> {
  const failedAt = failedDerivations.get(roomId);
  if (failedAt) {
    const elapsed = Date.now() - failedAt;
    if (elapsed < DERIVATION_COOLDOWN_MS) {
      throw new Error('Room key derivation on cooldown');
    }
    failedDerivations.delete(roomId);
  }

  if (roomKeys.has(roomId)) {
    const cached = roomKeys.get(roomId)!;
    // refresh LRU ordering
    roomKeys.delete(roomId);
    roomKeys.set(roomId, cached);
    return cached;
  }
  try {
    const { privateKey: myPrivEd, publicKey: myPub } = await getEd25519KeyPair();
    const myPubHex = Buffer.from(myPub).toString('hex');
    const salt = deriveChatSalt(myPubHex, peerPublicKey);
    const key = await deriveSharedKey(myPrivEd, peerPublicKey, roomId, salt);
    roomKeys.set(roomId, key);
    if (roomKeys.size > MAX_ROOM_KEYS) {
      const oldest = roomKeys.keys().next().value;
      if (oldest) {
        roomKeys.delete(oldest);
      }
    }
    failedDerivations.delete(roomId);
    return key;
  } catch (err) {
    failedDerivations.set(roomId, Date.now());
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
