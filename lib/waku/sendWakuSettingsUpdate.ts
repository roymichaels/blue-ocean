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

  const node = await createLightNode({ defaultBootstrap: true });
  try {
    await node.start();
    await waitForRemotePeer(node, [Protocols.LightPush]);

    const payloadData = {
      type: 'settings.update',
      key,
      value,
      createdAt,
      updatedAt,
      sender,
    };
    const payload = JSON.stringify(payloadData);

    const hash = sha256(new TextEncoder().encode(payload));
    const signature = privateKey
      ? edUtils.bytesToHex(await sign(hash, privateKey))
      : '';

    const finalPayload = JSON.stringify({ ...payloadData, signature });

    const encoder = node.createEncoder({ contentTopic: '/congress/settings/1' });
    await node.lightPush!.send(encoder, {
      payload: new TextEncoder().encode(finalPayload),
    });
  } finally {
    await node.stop();
  }

};
