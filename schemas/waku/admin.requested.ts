import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminJoinRequestSchema = wakuMessageSchema.extend({
  type: z.literal('admin.requested'),
  payload: z.object({
    wallet: z.string(),
  }),
});

export type AdminJoinRequestMessage = z.infer<typeof adminJoinRequestSchema>;
