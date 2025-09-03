import { Redirect } from 'expo-router';

export default function Index() {
  // Send users to the tabs group. Redirecting to "/" re-renders this screen
  // which triggers an endless navigation loop and "Maximum update depth"
  // warnings. Pointing to the tabs layout avoids reloading the current route.
  return <Redirect href="/(tabs)" />;
}
