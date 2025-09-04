import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';

const StorefrontScreen = React.lazy(() => import('./_StorefrontScreen'));

export default function StorefrontRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorBoundary>
        <StorefrontScreen {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}
