import { z } from 'zod';

export const E_STALE_DATA = 'E_STALE_DATA' as const;

export const staleDataErrorSchema = z.object({
  code: z.literal(E_STALE_DATA),
  expected: z.string(),
  actual: z.string(),
});

export type StaleDataError = z.infer<typeof staleDataErrorSchema>;

export function parseStaleDataError(data: unknown): StaleDataError | null {
  const res = staleDataErrorSchema.safeParse(data);
  return res.success ? res.data : null;
}
