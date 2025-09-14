import { verify } from '@noble/ed25519';
import type { WakuMessage } from '../types/waku';
import { canonicalJson } from './serialization';
import { z } from 'zod';
import { errorLog } from './logger';

export const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

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

export async function verifyBeforeWrite<T>(
  data: unknown,
  schema: z.ZodType<WakuMessage<T>>,
  allowedPublicKeys?: string[],
): Promise<WakuMessage<T> | null> {
  const res = schema.safeParse(data);
  if (!res.success) {
    errorLog('Invalid Waku message');
    return null;
  }
  const msg = res.data;
  const ok = await verifyMessageSignature(msg, msg.sender.publicKey);
  if (!ok) {
    errorLog('E_SIGNATURE_INVALID');
    return null;
  }
  const ts = (msg.payload as any)?.timestamp;
  if (typeof ts === 'number') {
    const skew = Math.abs(Date.now() - ts);
    if (skew > TIMESTAMP_TOLERANCE_MS) {
      errorLog('E_TIMESTAMP_SKEW');
      return null;
    }
  }
  if (allowedPublicKeys && !allowedPublicKeys.includes(msg.sender.publicKey)) {
    errorLog('E_UNAUTHORIZED');
    return null;
  }
  return msg;
}
