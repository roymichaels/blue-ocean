/* eslint-disable no-restricted-syntax */
import { router } from 'expo-router';

export function stripTabsPrefix(path?: string | null): string | undefined {
  if (typeof path !== 'string') return path ?? undefined;
  return path;
}

export function toTab(path: string) {
  return stripTabsPrefix(path) ?? path;
}

export function push(...args: Parameters<typeof router.push>) {
  (router as any).push(...args);
}

export function replace(...args: Parameters<typeof router.replace>) {
  (router as any).replace(...args);
}

