import { setConfig } from '../utils/appConfig';

export function insertConfig(values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) {
    setConfig(key, value);
  }
}
