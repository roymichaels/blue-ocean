import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuNotificationUpdate = async (notification: any) => {
  const node = await getNode();
  const sender = {
    address: tonAuth.getAddress(),
    publicKey: tonAuth.getTonPublicKey(),
  };
  const payloadObj = { type: 'notification.update', notification, sender };
  const message = JSON.stringify(payloadObj);
  const encrypted = await encryptWakuPayload(message);
  const encoder = node.createEncoder({ contentTopic: '/congress/notifications/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
