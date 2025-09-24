import { z } from 'zod';

export const settingsWriteEventSchema = z.object({
  type: z.literal('settings.write'),
  key: z.string(),
  value: z.string(),
  actor: z.string(),
  timestamp: z.number(),
});

export type SettingsWriteEvent = z.infer<typeof settingsWriteEventSchema>;

export function parseSettingsWriteEvent(data: unknown): SettingsWriteEvent | null {
  const res = settingsWriteEventSchema.safeParse(data);
  return res.success ? res.data : null;
}
