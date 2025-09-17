import { z } from 'zod';
import { wakuMessageSchema } from './message';

const orderStatuses = [
  'order_received',
  'courier_found',
  'courier_picked_up',
  'courier_on_way',
  'delivered',
  'disputed',
  'released',
  'refunded',
] as const;

export const orderStatusMessageSchema = wakuMessageSchema.extend({
  type: z.literal('order.status'),
  payload: z.object({
    orderId: z.string(),
    status: z.enum(orderStatuses),
    ts: z.number(),
    nonce: z.string(),
  }),
});

export type OrderStatusMessage = z.infer<typeof orderStatusMessageSchema>;
