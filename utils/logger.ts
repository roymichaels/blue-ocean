import config, { reloadConfig } from './appConfig';

const asBool = (value?: string) => value === 'true' || value === '1';

let DEBUG_LOGS = asBool(config.EXPO_PUBLIC_DEBUG_LOGS);

export function setDebugLogsEnabled(enabled: boolean): void {
  DEBUG_LOGS = enabled;
  if (typeof process !== 'undefined' && process?.env) {
    process.env.EXPO_PUBLIC_DEBUG_LOGS = enabled ? 'true' : 'false';
    try {
      reloadConfig();
      refreshDebugLogsFromConfig();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to reload config after toggling debug logs', err);
    }
  }
}

export function refreshDebugLogsFromConfig(): void {
  DEBUG_LOGS = asBool(config.EXPO_PUBLIC_DEBUG_LOGS);
}

export function isDebugLogsEnabled(): boolean {
  return DEBUG_LOGS;
}

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/\b0x[a-fA-F0-9]{40,}\b/g, '[REDACTED]')
      .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[REDACTED]');
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v)]),
    );
  }
  return value;
}

export function debugLog(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    // eslint-disable-next-line no-console
    console.debug(...args.map((a) => redact(a)));
  }
}

export function warnLog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export function errorLog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(...args.map((a) => redact(a)));
}

export { redact as redactLogValue };
