import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const DeliveriesScreen = React.lazy(() => import('./_DeliveriesScreen'));

export default function DeliveriesRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Deliveries" />}>
        <DeliveriesScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
