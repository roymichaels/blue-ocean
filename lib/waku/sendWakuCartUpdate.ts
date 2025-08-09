import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuCartUpdate = async (cartItem: any) => {
  const node = await getNode();
  const sender = {
    address: tonAuth.getAddress(),
    publicKey: tonAuth.getTonPublicKey(),
  };
  const payloadObj = { type: 'cart.update', cartItem, sender };
  const message = JSON.stringify(payloadObj);
  const signature = await tonAuth.requestSignature(message);
  const signed = { ...payloadObj, signature };
  const encrypted = await encryptWakuPayload(JSON.stringify(signed));
  const encoder = node.createEncoder({ contentTopic: '/congress/cart/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
