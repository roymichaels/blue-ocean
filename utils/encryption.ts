import * as nacl from 'tweetnacl';
import * as ed2curve from 'ed2curve';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Derive a shared AES-GCM key using ECDH over ed25519 keys.
 * @param myPrivateEd25519 Your private ed25519 key bytes
 * @param peerPublicEd25519Hex Peer public key as hex string
 * @param info Context or room identifier used in HKDF
 */
export async function deriveSharedKey(
  myPrivateEd25519: Uint8Array,
  peerPublicEd25519Hex: string,
  info: string,
): Promise<CryptoKey> {
  const myX = ed2curve.convertSecretKey(myPrivateEd25519);
  const peerX = ed2curve.convertPublicKey(Buffer.from(peerPublicEd25519Hex, 'hex'));
  if (!myX || !peerX) throw new Error('key conversion failed');
  const shared = nacl.scalarMult(myX, peerX);
  const derived = hkdf(sha256, shared, undefined, info, 32);
  return crypto.subtle.importKey(
    'raw',
    derived,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a UTF-8 message using AES-GCM.
 * Returns base64(iv) + ':' + base64(ciphertext)
 */
export async function aesEncrypt(
  msg: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(msg);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const ivStr = Buffer.from(iv).toString('base64');
  const dataStr = Buffer.from(new Uint8Array(cipher)).toString('base64');
  return `${ivStr}:${dataStr}`;
}

/**
 * Decrypt a string produced by {@link aesEncrypt}
 */
export async function aesDecrypt(
  payload: string,
  key: CryptoKey,
): Promise<string> {
  const [ivStr, dataStr] = payload.split(':');
  const iv = Uint8Array.from(Buffer.from(ivStr, 'base64'));
  const data = Uint8Array.from(Buffer.from(dataStr, 'base64'));
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}
