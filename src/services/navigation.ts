import { router } from 'expo-router';

const TABS_PREFIX = '/' + '(' + 'tabs' + ')';

function stripTabsPrefix(path?: string | null): string | undefined {
  if (typeof path !== 'string') return path ?? undefined;
  return path.startsWith(`${TABS_PREFIX}/`) ? path.replace(`${TABS_PREFIX}`, '') : path;
}

export function toTab(path: string) {
  return stripTabsPrefix(path) ?? path;
}

export function push(...args: Parameters<typeof router.push>) {
  if (typeof args[0] === 'string') {
    args[0] = stripTabsPrefix(args[0]) as any;
  } else if (typeof args[0] === 'object' && args[0] !== null && 'pathname' in args[0]) {
    args[0] = { ...args[0], pathname: stripTabsPrefix(args[0].pathname) } as any;
  }
  router.push(...(args as any));
}

export function replace(...args: Parameters<typeof router.replace>) {
  if (typeof args[0] === 'string') {
    args[0] = stripTabsPrefix(args[0]) as any;
  } else if (typeof args[0] === 'object' && args[0] !== null && 'pathname' in args[0]) {
    args[0] = { ...args[0], pathname: stripTabsPrefix(args[0].pathname) } as any;
  }
  router.replace(...(args as any));
}

