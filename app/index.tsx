import { Redirect } from 'expo-router';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function Index() {
  // Use a dedicated Redirect component to avoid navigating before the
  // root layout has mounted, which previously triggered errors.
  return (
    <ErrorBoundary>
      <Redirect href="/landing" /> {/* eslint-disable-line no-restricted-syntax */}
    </ErrorBoundary>
  );
}
