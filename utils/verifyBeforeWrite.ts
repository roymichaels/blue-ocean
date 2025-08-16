import { z } from 'zod';
import type { WakuMessage } from '../types/waku';
import { errorLog } from './logger';
import { verifyMessageSignature } from './verifyMessageSignature';

export async function verifyBeforeWrite<T>(
  data: unknown,
  schema: z.ZodType<WakuMessage<T>>,
): Promise<WakuMessage<T> | null> {
  const res = schema.safeParse(data);
  if (!res.success) {
    errorLog('Invalid Waku message', res.error.flatten());
    return null;
  }
  const msg = res.data;
  const ok = await verifyMessageSignature(msg, msg.sender.publicKey);
  if (!ok) {
    errorLog('Invalid message signature', msg);
    return null;
  }
  return msg;
}
