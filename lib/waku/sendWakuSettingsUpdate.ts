export const sendWakuSettingsUpdate = async (key: string, value: string) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payload = JSON.stringify({
    type: 'settings.update',
    key,
    value,
  });

  const encoder = node.createEncoder({ contentTopic: '/congress/settings/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(payload) });
};
