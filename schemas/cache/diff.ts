import { z } from 'zod';

export const cacheDiffOpSchema = z.object({
  op: z.enum(['set', 'delete']),
  path: z.string(),
  value: z.unknown().optional(),
});

export const cacheDiffMessageSchema = z.object({
  id: z.string(),
  version: z.number(),
  ops: z.array(cacheDiffOpSchema),
});

export type CacheDiffMessage<T = unknown> = z.infer<typeof cacheDiffMessageSchema> & {
  ops: Array<z.infer<typeof cacheDiffOpSchema> & { value?: T }>;
};

export function parseCacheDiffMessage<T>(
  data: unknown,
  valueSchema: z.ZodType<T>,
): CacheDiffMessage<T> | null {
  const schema = cacheDiffMessageSchema.extend({
    ops: z.array(cacheDiffOpSchema.extend({ value: valueSchema.optional() })),
  });
  const res = schema.safeParse(data);
  return res.success ? (res.data as CacheDiffMessage<T>) : null;
}
