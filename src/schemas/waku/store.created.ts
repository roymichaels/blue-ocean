import { z } from 'zod';
import type { Store } from '../../types';
import { wakuMessageSchema } from './message';

export const storeSchema: z.ZodType<Store> = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  nftId: z.string(),
  reputation: z.number().optional(),
  plan: z.enum(['free', 'premium']).optional(),
  createdAt: z.string().optional(),
});

export const storeCreatedSchema = wakuMessageSchema.extend({
  type: z.literal('store.created'),
  payload: storeSchema,
});

export type StoreCreatedMessage = z.infer<typeof storeCreatedSchema>;

export function parseStoreCreatedMessage(
  data: unknown,
): StoreCreatedMessage | null {
  const res = storeCreatedSchema.safeParse(data);
  return res.success ? res.data : null;
}

