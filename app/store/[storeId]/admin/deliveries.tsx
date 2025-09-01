import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const DeliveriesScreen = React.lazy(() => import('./_DeliveriesScreen'));

export default function DeliveriesRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Deliveries" />}>
      <DeliveriesScreen {...props} />
    </Suspense>
  );
}
