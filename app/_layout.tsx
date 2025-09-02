import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { getPathFromState } from '@react-navigation/native';
import AppProviders from '../providers/AppProviders';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (!__DEV__) return;
    const unsubscribe = router.addListener('state', (e: any) => {
      const nextPath = getPathFromState(e.data.state);
      const prevPath = prevPathRef.current;
      if (prevPath !== nextPath) {
        // eslint-disable-next-line no-console
        console.debug(`[Route] ${prevPath} -> ${nextPath}`);
        prevPathRef.current = nextPath;
      }
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (__DEV__ && pathname?.includes('(tabs)')) {
      console.warn("`(tabs)` should not appear in the pathname in development.");
    }
  }, [pathname]);

  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
