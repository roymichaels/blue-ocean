import React, { Suspense } from 'react';
import Spinner from '@/shared/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const OrdersScreen = React.lazy(() => import('./_OrdersScreen'));

export default function OrdersRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Orders" />}>
        <OrdersScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
