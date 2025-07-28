export interface WakuSender {
  id: string;
  publicKey: string;
  role: string;
}

export const sendWakuUserUpdate = async (
  user: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' }
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const payload = JSON.stringify({
    type: 'user.update',
    user,
    sender,
  });

  const encoder = node.createEncoder({ contentTopic: '/congress/users/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(payload) });
};
