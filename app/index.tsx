import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the landing page to avoid navigating to the current
  // route repeatedly which caused an infinite loop and the
  // "Maximum update depth exceeded" warning.
  return <Redirect href="/landing" />;
}
