import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const OrdersScreen = React.lazy(() => import('./_OrdersScreen'));

export default function OrdersRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <OrdersScreen {...props} />
    </Suspense>
  );
}
