// TODO:KYC-009 add required {ts:number, nonce:string}; reject skew>2min; replay cache TTL 10m
import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const kycRequestSchema = wakuMessageSchema.extend({
  type: z.literal('kyc.request'),
  payload: z.object({
    userId: z.string(),
    buyerPublicKey: z.string(),
    tenantId: z.string(),
    documentUri: z.string(),
    bundleHash: z.string(),
    bundleSig: z.string(),
    requestedAt: z.number(),
    ts: z.number(),
    nonce: z.string()
  })
});
export type KycRequestMessage = z.infer<typeof kycRequestSchema>;
