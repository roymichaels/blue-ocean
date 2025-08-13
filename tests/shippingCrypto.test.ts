import * as nacl from 'tweetnacl';
import { encryptShippingInfo, decryptShippingInfo } from '../utils/shippingCrypto';
import { getEd25519KeyPair } from '../services/localIdentity';

jest.mock('../services/localIdentity');

const seller = nacl.sign.keyPair();
const sellerPub = Buffer.from(seller.publicKey).toString('hex');
const buyer = nacl.sign.keyPair();
(getEd25519KeyPair as jest.Mock).mockResolvedValue({
  privateKey: buyer.secretKey,
  publicKey: buyer.publicKey,
});

describe('shippingCrypto', () => {
  it('performs ECDH round trip for shipping info', async () => {
    const addr = {
      name: 'Alice',
      phone: '1',
      street: 'st',
      city: 'c',
      postalCode: 'p',
    };
    const enc = await encryptShippingInfo(addr, sellerPub);
    const dec = await decryptShippingInfo(enc, seller.secretKey);
    expect(dec).toEqual(addr);
  });
});
