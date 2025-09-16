import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const kycReceiptPayloadSchema = z.object({
  receiptId: z.string(),
  buyerPublicKey: z.string(),
  issuerPublicKey: z.string(),
  issuedAt: z.string(),
  data: z.record(z.unknown()).optional().default({}),
  ts: z.number(),
  nonce: z.string(),
});

export const kycReceiptSchema = wakuMessageSchema.extend({
  type: z.literal('kyc.receipt'),
  payload: kycReceiptPayloadSchema,
});

export type KycReceiptMessage = z.infer<typeof kycReceiptSchema>;

export function parseKycReceiptMessage(data: unknown): KycReceiptMessage | null {
  const result = kycReceiptSchema.safeParse(data);
  return result.success ? result.data : null;
}
