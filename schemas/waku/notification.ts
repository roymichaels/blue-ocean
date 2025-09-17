import { z } from 'zod';
import type { Notification } from '../../types';

export const notificationSchema: z.ZodType<Notification> = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  link: z.string().optional(),
  type: z.enum(['order', 'promo', 'message', 'system']),
  read: z.boolean(),
  timestamp: z.number(),
});

export const notificationEventSchema = z.enum([
  'order.created',
  'payment.received',
  'status.updated',
  'dispute.updated',
  'escrow.deployed',
  'notify.orderCreated',
  'notify.orderFailed',
  'notify.direct',
]);

export type NotificationEvent = z.infer<typeof notificationEventSchema>;

export const notificationWakuPayloadSchema = z.object({
  type: notificationEventSchema,
  notification: notificationSchema,
  storeId: z.string().optional(),
  ts: z.number(),
  nonce: z.string(),
});

export type NotificationWakuPayload = z.infer<typeof notificationWakuPayloadSchema>;

export function parseNotificationWakuPayload(
  data: unknown,
): NotificationWakuPayload | null {
  const res = notificationWakuPayloadSchema.safeParse(data);
  return res.success ? res.data : null;
}
