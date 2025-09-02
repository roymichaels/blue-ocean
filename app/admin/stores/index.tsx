import React, { Suspense } from 'react';
import Spinner from '@/shared/ui/Spinner';
import RequireWallet from '../../../components/RequireWallet';

const StoresScreen = React.lazy(() => import('./_StoresScreen'));

export default function AdminStoresRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Stores" />}>
        <StoresScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
