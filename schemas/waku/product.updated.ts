import { z } from 'zod';
import type { Product } from '../../types';
import { wakuMessageSchema } from './message';

export const productSchema: z.ZodType<Product> = z.object({
  id: z.string(),
  tenant_id: z.string().optional(),
  name: z.string(),
  name_en: z.string().optional(),
  name_he: z.string().optional(),
  price: z.number(),
  originalPrice: z.number().optional(),
  description: z.string(),
  description_en: z.string().optional(),
  description_he: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  images: z.array(z.string()),
  videos: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  variants: z
    .array(
      z.object({
        color: z.string(),
        stock: z.number(),
      }),
    )
    .optional(),
  rating: z.number(),
  reviews: z.number(),
  badges: z.array(z.string()).optional(),
  pricingTier: z.string().optional(),
  mixGroupId: z.string().optional(),
  storeId: z.string(),
  stock: z.number(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const productUpdatedSchema = wakuMessageSchema.extend({
  type: z.literal('product.updated'),
  payload: productSchema,
});

export type ProductUpdatedMessage = z.infer<typeof productUpdatedSchema>;

export function parseProductUpdatedMessage(
  data: unknown,
): ProductUpdatedMessage | null {
  const res = productUpdatedSchema.safeParse(data);
  return res.success ? res.data : null;
}
