import { z } from 'zod';

// Payload that a wallet signs when requesting a scoped session token.
// The payload itself is not stored; only the resulting signature (token)
// is kept in memory.
export const scopeRequestSchema = z.object({
  scopes: z.array(z.string()),
  exp: z.number().int().positive(),
});

export type ScopeRequestPayload = z.infer<typeof scopeRequestSchema>;
