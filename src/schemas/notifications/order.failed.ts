import { z } from 'zod';
import { wakuMessageSchema } from '../waku/message';

export const orderFailedEventSchema = wakuMessageSchema.extend({
  type: z.literal('order.failed'),
  payload: z.object({
    orderId: z.string(),
    userId: z.string(),
    code: z.string(),
    reason: z.string(),
    ts: z.number(),
    nonce: z.string(),
  }),
});

export type OrderFailedEvent = z.infer<typeof orderFailedEventSchema>;
