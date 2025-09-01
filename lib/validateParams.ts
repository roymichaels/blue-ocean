import { z } from 'zod';

export const createValidateParams = <T extends z.ZodTypeAny>(schema: T) => {
  return (params: Record<string, unknown>) => schema.safeParse(params);
};

