import { requireConfig } from './env';

let DEBUG_LOGS = false;
requireConfig('EXPO_PUBLIC_DEBUG_LOGS')
  .then((v) => {
    DEBUG_LOGS = v === 'true';
  })
  .catch(() => {});

export function debugLog(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}
