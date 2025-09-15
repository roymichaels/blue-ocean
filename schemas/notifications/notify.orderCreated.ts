import { z } from 'zod';
import { notificationSchema } from '../waku/notification';

export const notifyOrderCreatedSchema = z.object({
  type: z.literal('notify.orderCreated'),
  notification: notificationSchema,
});

export type NotifyOrderCreated = z.infer<typeof notifyOrderCreatedSchema>;
