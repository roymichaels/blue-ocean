import * as nacl from 'tweetnacl';
import { encryptShippingInfo } from '../utils/shippingCrypto';
import { decryptOrderShipping } from '../services/sellerTools';
import { getPrivateKey } from '../services/localIdentity';
import { Order } from '../types';

jest.mock('../services/localIdentity');

describe('sellerTools.decryptOrderShipping', () => {
  it('decrypts shipping info using seller private key', async () => {
    const seller = nacl.sign.keyPair();
    (getPrivateKey as jest.Mock).mockResolvedValue(seller.secretKey);

    const addr = {
      name: 'Alice',
      phone: '1',
      street: 'st',
      city: 'c',
      postalCode: 'p',
    };

    const shipAddrEnc = await encryptShippingInfo(
      addr,
      Buffer.from(seller.publicKey).toString('hex'),
    );

    const order: Order = {
      id: 'o1',
      userId: 'u1',
      items: [],
      total: 0,
      status: 'order_received',
      shippingAddress: addr,
      shipAddrEnc,
      paymentMethod: 'ton',
      buyerAddress: 'b',
      sellerAddress: 's',
      itemsHash: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingSteps: [],
    };

    const decrypted = await decryptOrderShipping(order);
    expect(decrypted).toEqual(addr);
  });
});
