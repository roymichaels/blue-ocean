import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const StoreDetailScreen = React.lazy(() => import('./_StoreDetailScreen'));

export default function AdminStoreDetailRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <StoreDetailScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
