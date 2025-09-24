import { z } from 'zod';

export const backlogErrorSchema = z.object({
  code: z.literal('E_BACKLOG'),
  retryAfter: z.number().int().positive(),
});

export type BacklogError = z.infer<typeof backlogErrorSchema>;
