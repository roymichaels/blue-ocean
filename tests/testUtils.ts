import { reloadConfig } from '../utils/appConfig';

export function insertConfig(values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  reloadConfig();
}
