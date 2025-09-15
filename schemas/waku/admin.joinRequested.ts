import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminJoinRequestSchema = wakuMessageSchema.extend({
  type: z.literal('admin.joinRequested'),
  payload: z.object({
    address: z.string(),
    requestedAt: z.number().optional(),
  }),
});

export type AdminJoinRequestMessage = z.infer<typeof adminJoinRequestSchema>;
