import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Send users to the tabs group. Redirecting to "/" re-renders this screen
    // which triggers an endless navigation loop and "Maximum update depth"
    // warnings. Pointing to the tabs layout avoids reloading the current route.
    router.replace('/(tabs)'); // eslint-disable-line no-restricted-syntax
  }, [router]);

  return null;
}
