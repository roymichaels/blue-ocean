import { Redirect } from 'expo-router';
import { useRequirePlatformAdmin } from '@/services';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function AdminIndex() {
  useRequirePlatformAdmin();
  return (
    <ErrorBoundary>
      <Redirect href="/admin/overview" />
    </ErrorBoundary>
  );
}
