import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const OrdersScreen = React.lazy(() => import('./_OrdersScreen'));

export default function OrdersRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <OrdersScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
