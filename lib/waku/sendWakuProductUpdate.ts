import type { WakuSender } from './sendWakuUserUpdate';
import { encryptWakuPayload } from './wakuCrypto';
import { sha256 } from '@noble/hashes/sha256';


export const sendWakuProductUpdate = async (
  product: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' },
  privateKey = ''
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
  const { sign, etc: edBytes } = await import('@noble/ed25519');

  const node = await createLightNode({ defaultBootstrap: true });
  try {
    await node.start();
    await waitForRemotePeer(node, [Protocols.LightPush]);

  const payloadObj = {
    type: 'product.update',
    product,
    sender: { id: sender.id, publicKey: sender.publicKey, role: sender.role },
  };
  const payload = JSON.stringify(payloadObj);

  let signature = '';
  if (sender.privateKey) {
    try {
      const hash = sha256(new TextEncoder().encode(payload));
      const sig = await sign(hash, edBytes.hexToBytes(sender.privateKey));
      signature = edBytes.bytesToHex(sig);
    } catch (e) {
      console.error('Failed to sign Waku message', e);
    }
  }

  const message = JSON.stringify({ ...payloadObj, signature });

  const encrypted = await encryptWakuPayload(message);

  const encoder = node.createEncoder({ contentTopic: '/congress/products/1/proto' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
  } finally {
    await node.stop();
  }
};
