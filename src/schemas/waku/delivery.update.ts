import { z } from 'zod';
import { wakuMessageSchema } from './message';

const deliveryStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

export const deliveryUpdatePayloadSchema = z.object({
  event: z.enum(['order.created', 'delivery.assigned']),
  orderId: z.string(),
  storeId: z.string(),
  jobId: z.string().optional(),
  driverId: z.string().optional(),
  status: deliveryStatusSchema,
  timestamp: z.number(),
  ts: z.number(),
  nonce: z.string(),
});

export const deliveryUpdateMessageSchema = wakuMessageSchema.extend({
  type: z.literal('notify.deliveryUpdate'),
  payload: deliveryUpdatePayloadSchema,
});

export type DeliveryUpdateMessage = z.infer<typeof deliveryUpdateMessageSchema>;
