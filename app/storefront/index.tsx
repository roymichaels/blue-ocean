import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';

const StorefrontScreen = React.lazy(() => import('./_StorefrontScreen'));

export default function StorefrontRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <StorefrontScreen {...props} />
    </Suspense>
  );
}
