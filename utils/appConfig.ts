// Configuration values are loaded from environment variables.
// Only a minimal set of keys is supported at runtime.

const ENV_KEYS = [

  'EXPO_PUBLIC_DEBUG_LOGS',
  'EXPO_PUBLIC_WAKU_BOOTSTRAP',
  'EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY',
];

function loadConfig(): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      if (key === 'EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY') {
        cfg.moonpayKey = value;
      } else {
        cfg[key] = value;
      }
    }
  }
  return cfg;
}

const config: Record<string, string> = loadConfig();

export function reloadConfig(): void {
  const fresh = loadConfig();
  for (const key of Object.keys(config)) {
    delete config[key];
  }
  Object.assign(config, fresh);
}

export function getWakuBootstrapNodes(): string[] {
  const raw =
    config.EXPO_PUBLIC_WAKU_BOOTSTRAP ||
    process.env.EXPO_PUBLIC_WAKU_BOOTSTRAP;
  if (!raw) return [];
  return raw
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);
}

export default config;
