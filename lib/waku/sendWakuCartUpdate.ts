import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';

export const sendWakuCartUpdate = async (cartItem: any) => {
  const node = await getNode();
  const payloadObj = { type: 'cart.update', cartItem };
  const message = JSON.stringify(payloadObj);
  const encrypted = await encryptWakuPayload(message);
  const encoder = node.createEncoder({ contentTopic: '/congress/cart/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
