import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminJoinRequestSchema = wakuMessageSchema.extend({
  type: z.literal('admin.joinRequested'),
  payload: z.object({
    address: z.string(),
    displayName: z.string().optional(),
    nonce: z.string(),
    ts: z.number(),
  }),
});

export type AdminJoinRequestMessage = z.infer<typeof adminJoinRequestSchema>;
