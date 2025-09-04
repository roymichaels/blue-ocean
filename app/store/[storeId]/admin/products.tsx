import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const ProductsScreen = React.lazy(() => import('./_ProductsScreen'));

export default function ProductsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <ProductsScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
