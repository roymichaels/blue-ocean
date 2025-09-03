import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

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
        <DeliveriesScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
