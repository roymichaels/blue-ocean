import { getConfig } from './config';

export async function requireConfig(key: string): Promise<string> {
  const value = await getConfig(key);
  if (!value) {
    throw new Error(`Config value ${key} is required`);
  }
  return value;
}
