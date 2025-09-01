import React, { Suspense } from 'react';
import Spinner from '../../../components/ui/Spinner';

const StoresScreen = React.lazy(() => import('./_StoresScreen'));

export default function AdminStoresRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Stores" />}>
      <StoresScreen {...props} />
    </Suspense>
  );
}
