import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';

export const sendWakuOrderUpdate = async (order: any) => {
  const node = await getNode();
  const payloadObj = { type: 'order.update', order };
  const message = JSON.stringify(payloadObj);
  const encrypted = await encryptWakuPayload(message);
  const encoder = node.createEncoder({ contentTopic: '/congress/orders/1/proto' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
