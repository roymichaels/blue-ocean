// TODO:CORE-021 include {ts:number, nonce:string}; enforce skew<=2min
import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const orderPurchaseProofSchema = wakuMessageSchema.extend({
  type: z.literal('order.purchaseProof'),
  payload: z.object({
    orderId: z.string(),
    storeId: z.string(),
    buyerId: z.string(),
    sellerId: z.string(),
    escrowTx: z.string(),
    receiptHash: z.string(), // canonical hash of receipt/closing data
    closedAt: z.number(),    // unix ms
    ts: z.number(),
    nonce: z.string(),
    tenantId: z.string()
  })
});

export type OrderPurchaseProofMessage = z.infer<typeof orderPurchaseProofSchema>;
