import { z } from 'zod';

export const wakuMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  sender: z.object({
    publicKey: z.string(),
    role: z.string().optional(),
  }),
  signature: z.string(),
  ts: z.number(),
  nonce: z.string(),
  keyEpoch: z.number().optional(),
});

export type WakuMessage<T = unknown> = z.infer<typeof wakuMessageSchema> & {
  payload: T;
};

export function parseWakuMessage<T>(
  data: unknown,
  payloadSchema: z.ZodType<T>,
): WakuMessage<T> | null {
  const schema = wakuMessageSchema.extend({ payload: payloadSchema });
  const res = schema.safeParse(data);
  return res.success ? (res.data as WakuMessage<T>) : null;
}

export function isWakuMessage<T>(
  data: unknown,
  payloadSchema: z.ZodType<T>,
): data is WakuMessage<T> {
  return wakuMessageSchema.extend({ payload: payloadSchema }).safeParse(data)
    .success;
}
