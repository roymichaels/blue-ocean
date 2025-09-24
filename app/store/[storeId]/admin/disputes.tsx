import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '@/components/RequireWallet';

const DisputesScreen = React.lazy(() => import('./_DisputesScreen'));

export default function DisputesRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <DisputesScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
