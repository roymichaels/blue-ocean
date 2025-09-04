import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const DashboardScreen = React.lazy(() => import('./_DashboardScreen'));

export default function DashboardRoute(props: any) {
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
