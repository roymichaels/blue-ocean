import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';

const StoreScreen = React.lazy(() => import('./_StoreScreen'));

export default function StoreRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorBoundary>
        <StoreScreen {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}
