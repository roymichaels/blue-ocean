import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '@/components/RequireWallet';

const PricingTiersScreen = React.lazy(() => import('./_PricingTiersScreen'));

export default function PricingTiersRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <PricingTiersScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
