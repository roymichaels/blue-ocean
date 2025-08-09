import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuCategoryUpdate = async (category: any) => {
  const node = await getNode();
  const sender = {
    address: tonAuth.getAddress(),
    publicKey: tonAuth.getTonPublicKey(),
  };
  const payloadObj = { type: 'category.update', category, sender };
  const message = JSON.stringify(payloadObj);
  const encrypted = await encryptWakuPayload(message);
  const encoder = node.createEncoder({ contentTopic: '/congress/categories/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
