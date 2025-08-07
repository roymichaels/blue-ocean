import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';

export const sendWakuCategoryUpdate = async (category: any) => {
  const node = await getNode();
  const payloadObj = { type: 'category.update', category };
  const message = JSON.stringify(payloadObj);
  const encrypted = await encryptWakuPayload(message);
  const encoder = node.createEncoder({ contentTopic: '/congress/categories/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
