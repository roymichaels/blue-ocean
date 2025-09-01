import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const StoreDetailScreen = React.lazy(() => import('./_StoreDetailScreen'));

export default function AdminStoreDetailRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Store Detail" />}>
      <StoreDetailScreen {...props} />
    </Suspense>
  );
}
