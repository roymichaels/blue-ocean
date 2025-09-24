import { z } from 'zod';
import { wakuMessageSchema } from '../waku/message';

export const orderCreatedEventSchema = wakuMessageSchema.extend({
  type: z.literal('order.created'),
  payload: z.object({
    orderId: z.string(),
    userId: z.string(),
    total: z.number(),
    ts: z.number(),
    nonce: z.string(),
  }),
});

export type OrderCreatedEvent = z.infer<typeof orderCreatedEventSchema>;
