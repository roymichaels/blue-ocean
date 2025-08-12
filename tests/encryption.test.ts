import * as nacl from 'tweetnacl';
import { deriveSharedKey, aesEncrypt, aesDecrypt, deriveChatSalt } from '../utils/encryption';

describe('ECDH + AES utilities', () => {
  it('allow buyer and seller to exchange encrypted messages', async () => {
    const buyerSeed = nacl.randomBytes(32);
    const sellerSeed = nacl.randomBytes(32);
    const buyer = nacl.sign.keyPair.fromSeed(buyerSeed);
    const seller = nacl.sign.keyPair.fromSeed(sellerSeed);

    const buyerPubHex = Buffer.from(buyer.publicKey).toString('hex');
    const sellerPubHex = Buffer.from(seller.publicKey).toString('hex');
    const salt = deriveChatSalt(buyerPubHex, sellerPubHex);
    const buyerKey = await deriveSharedKey(buyerSeed, sellerPubHex, 'room1', salt);
    const sellerKey = await deriveSharedKey(sellerSeed, buyerPubHex, 'room1', salt);

    const message = 'hello seller';
    const cipher = await aesEncrypt(message, buyerKey);
    const plain = await aesDecrypt(cipher, sellerKey);
    expect(plain).toBe(message);
  });
});
