export function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export default requireEnv;
