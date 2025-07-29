const config: Record<string, string> = {};

export function setConfig(key: string, value: string): void {
  config[key] = value;
}

export default config;
