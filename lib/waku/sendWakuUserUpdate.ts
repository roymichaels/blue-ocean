import { encryptWakuPayload } from './wakuCrypto';
import { sha256 } from '@noble/hashes/sha256';


export interface WakuSender {
  id: string;
  publicKey: string;
  role: string;
  privateKey?: string;
}


export const sendWakuUserUpdate = async (
  user: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' },
  privateKey = ''
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
  const { sign, etc: edBytes } = await import('@noble/ed25519');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payloadObj = {
    type: 'user.update',
    user,
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

  const encrypted = await encryptWakuPayload(payload);

  const encoder = node.createEncoder({ contentTopic: '/congress/users/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });

};
