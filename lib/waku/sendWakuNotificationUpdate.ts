import type { WakuSender } from './sendWakuUserUpdate';
import { encryptWakuPayload } from './wakuCrypto';
import { sha256 } from '@noble/hashes/sha256';
import { getNode } from './nodeSingleton';

export const sendWakuNotificationUpdate = async (
  notification: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' },
  privateKey = ''
) => {
  const { sign, etc: edBytes } = await import('@noble/ed25519');

  const node = await getNode();

    const payloadObj = {
      type: 'notification.update',
      notification,
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

    const encoder = node.createEncoder({ contentTopic: '/congress/notifications/1' });
    await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
