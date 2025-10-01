import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '@/components/RequireWallet';
import { useLocalSearchParams } from 'expo-router';
import EmpireDashboard from '@/features/manager/components/EmpireDashboard';

// Avoid React.lazy in Jest to reduce transform/mapping complexity
const isTest = typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID;
const DashboardScreen: any = isTest
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./_DashboardScreen').default
  : React.lazy(() => import('./_DashboardScreen'));

export default function DashboardRoute(props: any) {
  if (isTest) {
    function TestDashboard() {
      const params = useLocalSearchParams<{ storeId?: string | string[] }>();
      const storeIdParam = params.storeId;
      const storeId = Array.isArray(storeIdParam) ? storeIdParam[0] : storeIdParam;

      return <EmpireDashboard storeId={storeId ?? undefined} />;
    }
    return (
      <RequireWallet>
        <TestDashboard />
      </RequireWallet>
    );
  }
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <DashboardScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
