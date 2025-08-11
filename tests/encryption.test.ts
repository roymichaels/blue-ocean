import * as nacl from 'tweetnacl';
import { deriveSharedKey, aesEncrypt, aesDecrypt } from '../utils/encryption';

describe('ECDH + AES utilities', () => {
  it('allow buyer and seller to exchange encrypted messages', async () => {
    const buyerSeed = nacl.randomBytes(32);
    const sellerSeed = nacl.randomBytes(32);
    const buyer = nacl.sign.keyPair.fromSeed(buyerSeed);
    const seller = nacl.sign.keyPair.fromSeed(sellerSeed);

    const buyerKey = await deriveSharedKey(buyerSeed, Buffer.from(seller.publicKey).toString('hex'), 'room1');
    const sellerKey = await deriveSharedKey(sellerSeed, Buffer.from(buyer.publicKey).toString('hex'), 'room1');

    const message = 'hello seller';
    const cipher = await aesEncrypt(message, buyerKey);
    const plain = await aesDecrypt(cipher, sellerKey);
    expect(plain).toBe(message);
  });
});
