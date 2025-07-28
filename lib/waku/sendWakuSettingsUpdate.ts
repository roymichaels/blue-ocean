import type { WakuSender } from './sendWakuUserUpdate';
import { encryptWakuPayload } from './wakuCrypto';

export const sendWakuSettingsUpdate = async (
  key: string,
  value: string,
  createdAt: number,
  updatedAt: number,
  sender: WakuSender = { id: '', publicKey: '', role: '' }
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  try {
    await node.start();
    await waitForRemotePeer(node, [Protocols.LightPush]);

    const payload = JSON.stringify({
      type: 'settings.update',
      key,
      value,
      createdAt,
      updatedAt,
    });

    const encrypted = await encryptWakuPayload(payload);

    const encoder = node.createEncoder({ contentTopic: '/congress/settings/1' });
    await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
  } finally {
    await node.stop();
  }

};
