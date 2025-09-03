import React, { Suspense } from 'react';
import Spinner from '@shared/ui/Spinner';

const StoreScreen = React.lazy(() => import('./_StoreScreen'));

export default function StoreRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Storefront" />}>
      <StoreScreen {...props} />
    </Suspense>
  );
}
