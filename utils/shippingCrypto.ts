import { ShippingAddress } from '../types';
import { getEd25519KeyPair } from '@/services/localIdentity';
import { deriveSharedKey, aesEncrypt, aesDecrypt, deriveChatSalt } from './encryption';
import { getPublicKey } from '@noble/ed25519';

export interface EncryptedShipping {
  cipher: string;
  from: string;
}

export async function encryptShippingInfo(
  info: ShippingAddress,
  sellerPublicKey: string,
): Promise<EncryptedShipping> {
  const { privateKey, publicKey } = await getEd25519KeyPair();
  const from = Buffer.from(publicKey).toString('hex');
  const salt = deriveChatSalt(from, sellerPublicKey);
  const key = await deriveSharedKey(privateKey, sellerPublicKey, 'shipping', salt);
  const cipher = await aesEncrypt(JSON.stringify(info), key);
  return { cipher, from };
}

export async function decryptShippingInfo(
  enc: EncryptedShipping,
  privKey?: Uint8Array,
): Promise<ShippingAddress | null> {
  let myPriv: Uint8Array;
  let myPubHex: string;
  if (privKey) {
    myPriv = privKey;
    const pub = await getPublicKey(privKey);
    myPubHex = Buffer.from(pub).toString('hex');
  } else {
    const kp = await getEd25519KeyPair();
    myPriv = kp.privateKey;
    myPubHex = Buffer.from(kp.publicKey).toString('hex');
  }
  const salt = deriveChatSalt(enc.from, myPubHex);
  const key = await deriveSharedKey(myPriv, enc.from, 'shipping', salt);
  const dec = await aesDecrypt(enc.cipher, key);
  return JSON.parse(dec);
}
