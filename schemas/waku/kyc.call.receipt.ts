import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const kycCallReceiptPayloadSchema = z.object({
  receiptId: z.string(),
  buyerPublicKey: z.string(),
  issuerPublicKey: z.string(),
  issuedAt: z.string(),
  data: z.record(z.unknown()).optional().default({}),
  ts: z.number(),
  nonce: z.string(),
});

export const kycCallReceiptSchema = wakuMessageSchema.extend({
  type: z.literal('kyc.call.receipt'),
  payload: kycCallReceiptPayloadSchema,
});

export type KycCallReceiptMessage = z.infer<typeof kycCallReceiptSchema>;

export function parseKycCallReceiptMessage(
  data: unknown,
): KycCallReceiptMessage | null {
  const result = kycCallReceiptSchema.safeParse(data);
  return result.success ? result.data : null;
}
