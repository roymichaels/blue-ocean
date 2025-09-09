import { xchacha20 } from '@noble/ciphers/chacha';
import { blake2b } from '@noble/hashes/blake2b';
import { randomBytes } from '@noble/hashes/utils';

// Derive a stable symmetric key for each topic using a Noise-style hash of the topic
// and a random root secret. This avoids storing raw topic names on the wire.
const rootSecret = randomBytes(32);
const topicKeys = new Map<string, Uint8Array>();

function topicKey(topic: string): Uint8Array {
  if (!topicKeys.has(topic)) {
    const enc = new TextEncoder().encode(topic);
    // Combine root secret with topic name and hash to 32 bytes key.
    const key = blake2b(Uint8Array.from([...rootSecret, ...enc]), { dkLen: 32 });
    topicKeys.set(topic, key);
  }
  return topicKeys.get(topic)!;
}

/**
 * Encrypt a payload for the given topic using xChaCha20.
 * The returned Uint8Array contains nonce || ciphertext.
 */
export function encrypt(topic: string, payload: Uint8Array): Uint8Array {
  const key = topicKey(topic);
  const nonce = randomBytes(24);
  const enc = xchacha20(key, nonce, payload);
  const out = new Uint8Array(nonce.length + enc.length);
  out.set(nonce, 0);
  out.set(enc, nonce.length);
  return out;
}

/**
 * Decrypt a payload previously encrypted with {@link encrypt}.
 */
export function decrypt(topic: string, payload: Uint8Array): Uint8Array {
  const key = topicKey(topic);
  const nonce = payload.slice(0, 24);
  const data = payload.slice(24);
  return xchacha20(key, nonce, data);
}

export default { encrypt, decrypt };
