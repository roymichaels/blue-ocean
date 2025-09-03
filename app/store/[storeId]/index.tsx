import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';

const StoreScreen = React.lazy(() => import('./_StoreScreen'));

export default function StoreRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <StoreScreen {...props} />
    </Suspense>
  );
}
