import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';

const ProductScreen = React.lazy(() => import('./_ProductScreen'));

export default function ProductRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorBoundary>
        <ProductScreen {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}

