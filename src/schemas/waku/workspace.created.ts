import { z } from 'zod';

import { wakuMessageSchema } from './message';

export const workspaceCreatedPayloadSchema = z.object({
  workspaceId: z.string(),
  session: z.string(),
  timestamp: z.number(),
});

export const workspaceCreatedSchema = wakuMessageSchema.extend({
  type: z.literal('workspace.created'),
  payload: workspaceCreatedPayloadSchema,
});

export type WorkspaceCreatedMessage = z.infer<typeof workspaceCreatedSchema>;

export type WorkspaceCreatedPayload = z.infer<
  typeof workspaceCreatedPayloadSchema
>;

export function parseWorkspaceCreatedMessage(
  data: unknown,
): WorkspaceCreatedMessage | null {
  const res = workspaceCreatedSchema.safeParse(data);
  return res.success ? res.data : null;
}

