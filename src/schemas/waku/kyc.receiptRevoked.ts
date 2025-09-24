// TODO:KYC-009 add required {ts:number, nonce:string}; reject skew>2min; replay cache TTL 10m
import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const kycReceiptRevokedSchema = wakuMessageSchema.extend({
  type: z.literal('kyc.receipt.revoked'),
  payload: z.object({
    receiptId: z.string(),
    buyerId: z.string(),
    tenantId: z.string(),
    reason: z.string().optional(),
    revokedAt: z.number(),
    ts: z.number(),
    nonce: z.string()
  })
});
export type KycReceiptRevokedMessage = z.infer<typeof kycReceiptRevokedSchema>;
