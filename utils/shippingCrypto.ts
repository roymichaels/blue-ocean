import * as nacl from 'tweetnacl';
import * as ed2curve from 'ed2curve';
import { ShippingAddress } from '../types';
import { getPrivateKey } from '../services/localIdentity';

export interface EncryptedShipping {
  cipher: string;
  nonce: string;
  ephem: string;
}

export async function encryptShippingInfo(
  info: ShippingAddress,
  sellerPublicKey: string,
): Promise<EncryptedShipping> {
  const sellerPubX = ed2curve.convertPublicKey(Buffer.from(sellerPublicKey, 'hex'));
  if (!sellerPubX) throw new Error('invalid seller key');
  const ephem = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msg = Buffer.from(JSON.stringify(info));
  const cipher = nacl.box(msg, nonce, sellerPubX, ephem.secretKey);
  return {
    cipher: Buffer.from(cipher).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64'),
    ephem: Buffer.from(ephem.publicKey).toString('base64'),
  };
}

export async function decryptShippingInfo(
  enc: EncryptedShipping,
  privKey?: Uint8Array,
): Promise<ShippingAddress | null> {
  const secret = privKey ?? (await getPrivateKey());
  const privX = ed2curve.convertSecretKey(secret);
  if (!privX) return null;
  const decrypted = nacl.box.open(
    Buffer.from(enc.cipher, 'base64'),
    Buffer.from(enc.nonce, 'base64'),
    Buffer.from(enc.ephem, 'base64'),
    privX,
  );
  if (!decrypted) return null;
  return JSON.parse(Buffer.from(decrypted).toString());
}
