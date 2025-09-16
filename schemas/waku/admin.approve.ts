import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminApproveSchema = wakuMessageSchema.extend({
  type: z.literal('admin.approve'),
  payload: z.object({
    address: z.string(),
    nonce: z.string(),
    ts: z.number(),
  }),
});

export type AdminApproveMessage = z.infer<typeof adminApproveSchema>;
