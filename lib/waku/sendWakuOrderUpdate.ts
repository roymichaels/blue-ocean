import type { WakuSender } from './sendWakuUserUpdate';

export const sendWakuOrderUpdate = async (
  order: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' }
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payload = JSON.stringify({
    type: 'order.update',
    order,
    sender,
  });

  const encoder = node.createEncoder({ contentTopic: '/congress/orders/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(payload) });
};
