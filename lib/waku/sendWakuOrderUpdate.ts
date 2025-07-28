export const sendWakuOrderUpdate = async (order: any) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payload = JSON.stringify({
    type: 'order.update',
    order,
  });

  const encoder = node.createEncoder({ contentTopic: '/congress/orders/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(payload) });
};
