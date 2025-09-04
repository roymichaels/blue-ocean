import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../components/RequireWallet';

const StoresScreen = React.lazy(() => import('./_StoresScreen'));

export default function AdminStoresRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <StoresScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
