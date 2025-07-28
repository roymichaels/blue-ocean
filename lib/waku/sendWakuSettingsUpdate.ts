import { encryptSyncMessage } from '../../utils/wakuCrypto';

export const sendWakuSettingsUpdate = async (
  key: string,
  value: string,
  createdAt: number,
  updatedAt: number,
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  try {
    await waitForRemotePeer(node, [Protocols.LightPush]);

    const payload = JSON.stringify({
      type: 'settings.update',
      key,
      value,
      createdAt,
      updatedAt,
    });
    const encrypted = await encryptSyncMessage(payload);

    const encoder = node.createEncoder({ contentTopic: '/congress/settings/1' });
    await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
  } finally {
    await node.stop();
  }
};
