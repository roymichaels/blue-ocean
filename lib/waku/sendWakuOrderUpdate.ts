import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuOrderUpdate = async (order: any) => {
  const node = await getNode();
  const sender = {
    address: tonAuth.getAddress(),
    publicKey: tonAuth.getTonPublicKey(),
  };
  const payloadObj = { type: 'order.update', order, sender };
  const message = JSON.stringify(payloadObj);
  const encrypted = await encryptWakuPayload(message);
  const encoder = node.createEncoder({ contentTopic: '/congress/orders/1/proto' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
