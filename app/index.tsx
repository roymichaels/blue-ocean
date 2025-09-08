import { Redirect } from 'expo-router';

// Redirect the root path to the main tabs layout
export default function Index() {
  // eslint-disable-next-line no-restricted-syntax
  return <Redirect href='/(tabs)' />;
}
