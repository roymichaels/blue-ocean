import type { WakuSender } from './sendWakuUserUpdate';
import { sign, utils as edUtils } from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';

export const sendWakuProductUpdate = async (
  product: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' },
  privateKey = ''
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payloadData = {
    type: 'product.update',
    product,
    sender,
  };
  const payload = JSON.stringify(payloadData);

  const hash = sha256(new TextEncoder().encode(payload));
  const signature = privateKey
    ? edUtils.bytesToHex(await sign(hash, privateKey))
    : '';

  const finalPayload = JSON.stringify({ ...payloadData, signature });

  const encoder = node.createEncoder({ contentTopic: '/congress/products/1' });
  await node.lightPush!.send(encoder, {
    payload: new TextEncoder().encode(finalPayload),
  });
};
