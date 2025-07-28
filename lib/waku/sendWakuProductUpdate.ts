import type { WakuSender } from './sendWakuUserUpdate';

export const sendWakuProductUpdate = async (
  product: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' }
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payload = JSON.stringify({
    type: 'product.update',
    product,
    sender,
  });

  const encoder = node.createEncoder({ contentTopic: '/congress/products/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(payload) });
};
