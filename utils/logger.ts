export const DEBUG_LOGS = process.env.EXPO_PUBLIC_DEBUG_LOGS === 'true';

export function debugLog(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}
