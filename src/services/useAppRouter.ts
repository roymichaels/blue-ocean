/* eslint-disable no-restricted-syntax */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { debugLog } from '@/utils/logger';
import {
  push as navigationPush,
  replace as navigationReplace,
} from '@/services/navigation';

function warnGroupPath(path: unknown) {
  if (__DEV__ && typeof path === 'string' && /(\([^/]+\))/g.test(path)) {
    console.warn('[router] group segment in path', path);
  }
}

export function useAppRouter() {
  const router = useRouter();

  const push = useCallback(
    (...args: Parameters<typeof navigationPush>) => {
      debugLog('[router] push', ...args);
      warnGroupPath(args[0]);
      navigationPush(...args);
    },
    [],
  );

  const replace = useCallback(
    (...args: Parameters<typeof navigationReplace>) => {
      debugLog('[router] replace', ...args);
      warnGroupPath(args[0]);
      navigationReplace(...args);
    },
    [],
  );

  const back = useCallback(() => {
    debugLog('[router] back');
    router.back();
  }, [router]);

  const canGoBack = useCallback(() => {
    return typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
  }, [router]);

  return { push, replace, back, canGoBack };
}

export default useAppRouter;
