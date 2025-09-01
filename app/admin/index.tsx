import { Redirect } from 'expo-router';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function AdminIndex() {
  useRequirePlatformAdmin();
  return (
    <ErrorBoundary>
      <Redirect href="/admin/overview" />
    </ErrorBoundary>
  );
}
