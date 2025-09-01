import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const StoreDetailScreen = React.lazy(() => import('./_StoreDetailScreen'));

export default function AdminStoreDetailRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Store Detail" />}>
        <StoreDetailScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
