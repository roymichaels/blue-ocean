import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminRecoveryVerifySchema = wakuMessageSchema.extend({
  type: z.literal('admin.recovery.verify'),
  payload: z.object({
    tenantId: z.string(),
    codeId: z.string(),
    code: z.string(),
    deviceId: z.string(),
    grantTtlMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
    nonce: z.string(),
    ts: z.number(),
  }),
});

export type AdminRecoveryVerifyMessage = z.infer<typeof adminRecoveryVerifySchema>;
