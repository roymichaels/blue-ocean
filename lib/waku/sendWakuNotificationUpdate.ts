import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuNotificationUpdate = async (
  notification: any,
  requireSignature = true,
) => {
  const node = await getNode();
  const payloadObj: any = { type: 'notification.update', notification };
  if (requireSignature) {
    const sender = {
      address: tonAuth.getAddress(),
      publicKey: tonAuth.getTonPublicKey(),
    };
    payloadObj.sender = sender;
    const message = JSON.stringify(payloadObj);
    const signature = await tonAuth.requestSignature(message);
    payloadObj.signature = signature;
  }
  const encrypted = await encryptWakuPayload(JSON.stringify(payloadObj));
  const encoder = node.createEncoder({ contentTopic: '/congress/notifications/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
