import { Redirect } from 'expo-router';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function Index() {
  return (
    <ErrorBoundary>
      <Redirect href="/(tabs)" />
    </ErrorBoundary>
  );
}

