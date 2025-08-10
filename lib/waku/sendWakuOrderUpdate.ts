import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuOrderUpdate = async (
  order: any,
  requireSignature = true,
) => {
  const node = await getNode();
  const payloadObj: any = { type: 'order.update', order };
  if (requireSignature) {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to continue.');
    }
    const sender = { address, publicKey };
    payloadObj.sender = sender;
    const message = JSON.stringify(payloadObj);
    const signature = await tonAuth.requestSignature(message);
    if (!signature) {
      throw new Error('Signature request was rejected by the wallet.');
    }
    payloadObj.signature = signature;
  }
  const encrypted = await encryptWakuPayload(JSON.stringify(payloadObj));
  const encoder = node.createEncoder({ contentTopic: '/congress/orders/1/proto' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
