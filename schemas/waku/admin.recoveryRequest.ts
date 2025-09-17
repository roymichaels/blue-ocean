import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const adminRecoveryRequestSchema = wakuMessageSchema.extend({
  type: z.literal('admin.recovery.request'),
  payload: z.object({
    tenantId: z.string(),
    codeId: z.string(),
    code: z.string(),
    deviceId: z.string(),
    targetPublicKey: z.string().optional(),
    approvalsRequired: z.number().int().min(1).max(10).optional(),
    nonce: z.string(),
    ts: z.number(),
  }),
});

export type AdminRecoveryRequestMessage = z.infer<typeof adminRecoveryRequestSchema>;
