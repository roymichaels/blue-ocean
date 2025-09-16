import { z } from 'zod';
import { wakuMessageSchema } from './message';

export const productDeletedPayloadSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  deletedAt: z.string().optional(),
});

export const productDeletedSchema = wakuMessageSchema.extend({
  type: z.literal('product.deleted'),
  payload: productDeletedPayloadSchema,
});

export type ProductDeletedMessage = z.infer<typeof productDeletedSchema>;

export function parseProductDeletedMessage(
  data: unknown,
): ProductDeletedMessage | null {
  const res = productDeletedSchema.safeParse(data);
  return res.success ? res.data : null;
}
