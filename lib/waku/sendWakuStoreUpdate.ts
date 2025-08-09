import { encryptWakuPayload } from './wakuCrypto';
import { getNode } from './nodeSingleton';
import tonAuth from '../../services/tonAuth';

export const sendWakuStoreUpdate = async (store: any) => {
  const node = await getNode();
  const sender = {
    address: tonAuth.getAddress(),
    publicKey: tonAuth.getTonPublicKey(),
  };
  const payloadObj = { type: 'store.update', store, sender };
  const message = JSON.stringify(payloadObj);
  const signature = await tonAuth.requestSignature(message);
  const signed = { ...payloadObj, signature };
  const encrypted = await encryptWakuPayload(JSON.stringify(signed));
  const encoder = node.createEncoder({ contentTopic: '/congress/stores/1/proto' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
