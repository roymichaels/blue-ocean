import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the root route and let Expo Router handle the tab layout.
  // Using "/" avoids repeating the current route which previously caused
  // an infinite loop and a "Maximum update depth exceeded" warning.
  return <Redirect href="/" />;
}
