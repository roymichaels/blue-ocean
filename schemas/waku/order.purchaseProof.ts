import { z } from 'zod';
import { wakuMessageSchema } from './message';

// TODO:CORE-011 Replace placeholder property definitions once purchase proof payload is finalized.
export const orderPurchaseProofPayloadSchema = z.object({
  orderId: z.unknown(),
  buyerId: z.unknown(),
  sellerId: z.unknown(),
  storeId: z.unknown(),
  escrowTx: z.unknown(),
  closedAt: z.unknown(),
  receiptHash: z.unknown(),
  ts: z.unknown(),
  nonce: z.unknown(),
});

export const orderPurchaseProofMessageSchema = wakuMessageSchema.extend({
  type: z.literal('order.purchaseProof'),
  payload: orderPurchaseProofPayloadSchema,
});

export type OrderPurchaseProofMessage = z.infer<typeof orderPurchaseProofMessageSchema>;
