import { getWakuIdentity } from './identity';

export const sendWakuSettingsUpdate = async (
  key: string,
  value: string,
  createdAt: number,
  updatedAt: number,
) => {
  const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
  const { sha256 } = await import('@noble/hashes/sha256');
  const ed = await import('@noble/ed25519');

  const node = await createLightNode({ defaultBootstrap: true });
  await node.start();
  await waitForRemotePeer(node, [Protocols.LightPush]);

  const base = {
    type: 'settings.update',
    key,
    value,
    createdAt,
    updatedAt,
  };
  const payload = JSON.stringify(base);
  const sender = await getWakuIdentity();
  const hash = sha256(new TextEncoder().encode(payload));
  const sigBytes = await ed.sign(hash, Buffer.from(sender.privateKey, 'hex'));
  const signature = Buffer.from(sigBytes).toString('hex');
  const message = JSON.stringify({ ...base, sender: { publicKey: sender.publicKey }, signature });

  const encoder = node.createEncoder({ contentTopic: '/congress/settings/1' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(message) });
};
