import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { debugLog } from '@/utils/logger';

function warnGroupPath(path: unknown) {
  if (__DEV__ && typeof path === 'string' && /(\([^/]+\))/g.test(path)) {
    console.warn('[router] group segment in path', path);
  }
}

export function useAppRouter() {
  const router = useRouter();

  const push = useCallback(
    (...args: Parameters<typeof router.push>) => {
      debugLog('[router] push', ...args);
      warnGroupPath(args[0]);
      router.push(...args);
    },
    [router],
  );

  const replace = useCallback(
    (...args: Parameters<typeof router.replace>) => {
      debugLog('[router] replace', ...args);
      warnGroupPath(args[0]);
      router.replace(...args);
    },
    [router],
  );

  const back = useCallback(() => {
    debugLog('[router] back');
    router.back();
  }, [router]);

  return { push, replace, back };
}

export default useAppRouter;
