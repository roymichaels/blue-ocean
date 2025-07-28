import type { WakuSender } from './sendWakuUserUpdate';
import { sign, utils as edUtils } from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';

export const sendWakuSettingsUpdate = async (
  key: string,
  value: string,
  createdAt: number,
  updatedAt: number,
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
      type: 'settings.update',
      key,
      value,
      createdAt,
      updatedAt,
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

    const encoder = node.createEncoder({ contentTopic: '/congress/settings/1' });
    await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(message) });
  } finally {
    await node.stop();
  }

};
