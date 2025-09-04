import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const OrdersScreen = React.lazy(() => import('./_OrdersScreen'));

export default function OrdersRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <OrdersScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
