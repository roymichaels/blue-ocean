import { Redirect } from 'expo-router';

// Redirect the root path to the landing page so `/` always resolves.
export default function Index() {
  return <Redirect href='/landing' />;
}
