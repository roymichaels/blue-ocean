import * as nacl from 'tweetnacl';
import * as ed2curve from 'ed2curve';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { getPrivateKey } from '../services/localIdentity';

const roomKeys: Record<string, CryptoKey | null> = {};

export async function getRoomKey(
  roomId: string,
  peerPublicKey: string,
): Promise<CryptoKey | null> {
  if (roomKeys.hasOwnProperty(roomId)) return roomKeys[roomId];
  try {
    const myPrivEd = await getPrivateKey();
    const peerEd = Buffer.from(peerPublicKey, 'hex');
    const myPrivX = ed2curve.convertSecretKey(myPrivEd);
    const peerPubX = ed2curve.convertPublicKey(peerEd);
    if (!myPrivX || !peerPubX) throw new Error('conversion failed');
    const shared = nacl.scalarMult(myPrivX, peerPubX);
    const derived = hkdf(sha256, shared, undefined, roomId, 32);
    const key = await crypto.subtle.importKey(
      'raw',
      derived,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
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
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(msg);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const ivStr = Buffer.from(iv).toString('base64');
  const dataStr = Buffer.from(new Uint8Array(cipher)).toString('base64');
  return ivStr + ':' + dataStr;
}

export async function decryptMessage(
  msg: string,
  roomId: string,
  peerPublicKey: string,
): Promise<string> {
  try {
    const [ivStr, dataStr] = msg.split(':');
    if (!ivStr || !dataStr) return msg;
    const key = await getRoomKey(roomId, peerPublicKey);
    if (!key) return msg;
    const iv = Uint8Array.from(Buffer.from(ivStr, 'base64'));
    const data = Uint8Array.from(Buffer.from(dataStr, 'base64'));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(dec);
  } catch {
    return msg;
  }
}
