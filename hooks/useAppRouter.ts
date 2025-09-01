import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { debugLog } from '@/utils/logger';

export function useAppRouter() {
  const router = useRouter();

  const push = useCallback(
    (...args: Parameters<typeof router.push>) => {
      debugLog('[router] push', ...args);
      router.push(...args);
    },
    [router],
  );

  const replace = useCallback(
    (...args: Parameters<typeof router.replace>) => {
      debugLog('[router] replace', ...args);
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
