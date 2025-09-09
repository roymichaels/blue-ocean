import { verify } from '@noble/ed25519';
import type { WakuMessage } from '../types/waku';
import { canonicalJson } from './serialization';

export async function verifyMessageSignature<T>(
  message: WakuMessage<T>,
  publicKey: string,
): Promise<boolean> {
  try {
    const msgBytes = new TextEncoder().encode(
      canonicalJson({
        type: message.type,
        payload: message.payload,
        sender: message.sender,
      }),
    );
    const sigBytes = Uint8Array.from(
      Buffer.from(message.signature.replace(/^0x/, ''), 'hex'),
    );
    const pubBytes = Uint8Array.from(
      Buffer.from(publicKey.replace(/^0x/, ''), 'hex'),
    );
    return await verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}
