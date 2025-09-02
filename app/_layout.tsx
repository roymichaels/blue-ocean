import { Slot, usePathname } from 'expo-router';
import { useEffect } from 'react';
import AppProviders from '../providers/AppProviders';

export default function RootLayout() {
  const pathname = usePathname();

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
