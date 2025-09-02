import React, { Suspense } from 'react';
import Spinner from '@/shared/ui/Spinner';

const StorefrontScreen = React.lazy(() => import('./_StorefrontScreen'));

export default function StorefrontRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Storefront" />}>
      <StorefrontScreen {...props} />
    </Suspense>
  );
}
