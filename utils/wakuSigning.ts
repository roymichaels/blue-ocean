import { canonicalJson } from '@/utils/serialization';
import { getPrivateKey, getPublicKeyHex } from '@/services/localIdentity';
import type { WakuMessage } from '@/types/waku';
import { sign } from '@noble/ed25519';

const textEncoder = new TextEncoder();

export async function makeSignedWakuMessage<T>(
  type: string,
  payload: T,
  role: string,
): Promise<WakuMessage<T>> {
  const priv = await getPrivateKey();
  const pub = await getPublicKeyHex();
  const message: WakuMessage<T> = {
    type,
    payload,
    sender: { publicKey: pub, role },
    signature: '',
  };
  const toSign = textEncoder.encode(
    canonicalJson({ type: message.type, payload: message.payload, sender: message.sender }),
  );
  const sig = await sign(toSign, priv);
  message.signature = Buffer.from(sig).toString('hex');
  return message;
}
