import { z } from 'zod';

export const cacheHistoryEntrySchema = z.object({
  id: z.string(),
  version: z.number(),
  value: z.unknown(),
});

export type CacheHistoryEntry<T = unknown> = z.infer<typeof cacheHistoryEntrySchema> & {
  value: T;
};

export const cacheHistoryStreamSchema = z.array(cacheHistoryEntrySchema);
export type CacheHistoryStream<T = unknown> = CacheHistoryEntry<T>[];

export function parseCacheHistoryStream<T>(
  data: unknown,
  valueSchema: z.ZodType<T>,
): CacheHistoryStream<T> | null {
  const schema = cacheHistoryEntrySchema.extend({ value: valueSchema });
  const res = z.array(schema).safeParse(data);
  return res.success ? (res.data as CacheHistoryStream<T>) : null;
}
