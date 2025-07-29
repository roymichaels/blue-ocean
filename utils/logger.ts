import config from './appConfig';

let DEBUG_LOGS = false;
DEBUG_LOGS = config.EXPO_PUBLIC_DEBUG_LOGS === 'true';

export function debugLog(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}
