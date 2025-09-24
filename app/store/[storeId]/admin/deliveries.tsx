import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '@/components/RequireWallet';

// Lazy-load the deliveries management screen to reduce the main bundle
const DeliveriesScreen = React.lazy(() =>
  import(
    /* webpackChunkName: "admin-deliveries" */ './_DeliveriesScreen'
  )
);

export default function DeliveriesRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <DeliveriesScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
