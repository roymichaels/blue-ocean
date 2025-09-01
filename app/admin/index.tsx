import { Redirect } from 'expo-router';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RequireWallet from '../../components/RequireWallet';

export default function AdminIndex() {
  useRequirePlatformAdmin();
  return (
    <RequireWallet>
      <ErrorBoundary>
        <Redirect href="/admin/overview" />
      </ErrorBoundary>
    </RequireWallet>
  );
}
