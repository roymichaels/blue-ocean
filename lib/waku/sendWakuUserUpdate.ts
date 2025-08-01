import { encryptWakuPayload } from './wakuCrypto';
import { sha256 } from '@noble/hashes/sha256';
import { getPrivateKey } from '../../utils/privateKeyStorage';
import { getNode } from './nodeSingleton';


export interface WakuSender {
  id: string;
  publicKey: string;
  role: string;
  privateKey?: string;
}


export const sendWakuUserUpdate = async (
  user: any,
  sender: WakuSender = { id: '', publicKey: '', role: '' },
  privateKey = ''
) => {
  const { sign, etc: edBytes } = await import('@noble/ed25519');

  // populate missing sender fields from the user record
  sender = {
    id: sender.id || user.id,
    publicKey: sender.publicKey || user.publicKey,
    role: sender.role || user.role,
    privateKey: sender.privateKey,
  } as WakuSender;

  if (!privateKey) {
    const stored = await getPrivateKey();
    if (stored) privateKey = stored;
  }

  const node = await getNode();

  const payloadObj = {
    type: 'user.update',
    user,
    sender: { id: sender.id, publicKey: sender.publicKey, role: sender.role },
  };
  const payload = JSON.stringify(payloadObj);

  let signature = '';
  const keyToUse = sender.privateKey || privateKey;
  if (keyToUse) {
    try {
      const hash = sha256(new TextEncoder().encode(payload));
      const sig = await sign(hash, edBytes.hexToBytes(keyToUse));
      signature = edBytes.bytesToHex(sig);
    } catch (e) {
      console.error('Failed to sign Waku message', e);
    }
  }

  const message = JSON.stringify({ ...payloadObj, signature });

  const encrypted = await encryptWakuPayload(message);

  const encoder = node.createEncoder({ contentTopic: '/congress/users/1/proto' });
  await node.lightPush!.send(encoder, { payload: new TextEncoder().encode(encrypted) });
};
