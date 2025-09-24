import { z } from 'zod';
import { notificationSchema } from '../waku/notification';

export const notifyOrderFailedSchema = z.object({
  type: z.literal('notify.orderFailed'),
  notification: notificationSchema,
});

export type NotifyOrderFailed = z.infer<typeof notifyOrderFailedSchema>;
