import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RequireWallet from '../../components/RequireWallet';

export default function AdminIndex() {
  useRequirePlatformAdmin();
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/overview'); // eslint-disable-line no-restricted-syntax
  }, [router]);

  return (
    <RequireWallet>
      <ErrorBoundary>{null}</ErrorBoundary>
    </RequireWallet>
  );
}
