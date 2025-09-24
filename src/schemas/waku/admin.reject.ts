import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminRejectSchema = wakuMessageSchema.extend({
  type: z.literal('admin.reject'),
  payload: z.object({
    address: z.string(),
    nonce: z.string(),
    ts: z.number(),
  }),
});

export type AdminRejectMessage = z.infer<typeof adminRejectSchema>;
